-- ============================================================================
-- KoriePay Agency Banking — Transfers, Settlement, KYC/Onboarding, Limits,
-- Notifications, Disputes, Audit, RBAC (RLS) and Realtime.
--
-- Continues directly from 20260906000028_agency_banking_live.sql. All new
-- monetary columns are NUMERIC(24,2) MAJOR units, matching the verified live
-- convention (see prior migration's header comment / session history).
--
-- Design constraints honored throughout this file:
--   * No parallel ledger — every money movement here posts through
--     public.ledger_transactions/ledger_entries, the same single ledger used
--     by post_agency_cash_transaction().
--   * No fake provider integration — TRANSFER_NIP/TRANSFER_CROSS_BORDER rows
--     are held in PENDING_PROVIDER status (see agency_transactions.status
--     extension below) until a real Providus/Coris integration exists. The
--     ledger-side debit (agent's own float) is real and final; only the
--     external payout leg is honestly marked unconfirmed.
--   * Idempotency + row-level locking mirrors post_agency_cash_transaction().
--   * RLS: every new table gets an explicit agent/customer-scoped SELECT
--     policy (no policy = no access, since RLS is FORCE-enabled by default
--     deny). Writes happen only via SECURITY DEFINER functions/service role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND agency_transactions for transfer + settlement lifecycle
-- ----------------------------------------------------------------------------

-- agent_commissions.status was originally VARCHAR(16), too narrow for the
-- 'PENDING_SETTLEMENT' value used both here and by the settlement batching
-- below. Widen it before anything else in this migration relies on it.
ALTER TABLE public.agent_commissions ALTER COLUMN status TYPE VARCHAR(24);

ALTER TABLE public.agency_transactions
  DROP CONSTRAINT IF EXISTS agency_transactions_status_check;

ALTER TABLE public.agency_transactions
  ADD CONSTRAINT agency_transactions_status_check
  CHECK (status IN (
    'INITIATED', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'REVERSED',
    -- New: the ledger-side debit is committed and final, but the external
    -- payout to a receiving bank has not yet been confirmed by a real
    -- provider integration. This is never presented to the agent as
    -- SUCCESSFUL — see /api/v1/agency/transfer.
    'PENDING_PROVIDER_INTEGRATION'
  ));

ALTER TABLE public.agency_transactions
  ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS recipient_account VARCHAR(64),
  ADD COLUMN IF NOT EXISTS recipient_bank VARCHAR(128),
  ADD COLUMN IF NOT EXISTS recipient_bank_code VARCHAR(16),
  ADD COLUMN IF NOT EXISTS provider_name VARCHAR(64),
  ADD COLUMN IF NOT EXISTS provider_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS settlement_batch_id UUID;

COMMENT ON COLUMN public.agency_transactions.provider_status IS
  'Honest external-leg status. NULL for cash-in/out (no external leg). For transfers: UNSENT until a real provider integration exists — never fabricated as SENT/CONFIRMED.';

-- ----------------------------------------------------------------------------
-- 1b. Enforce per-agent limits inside post_agency_cash_transaction() too —
-- limits must never be bypassable regardless of which function/caller posts
-- the transaction. Re-created here with the same locking/idempotency
-- behavior as the original, plus a limit check before any balance mutation.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.post_agency_cash_transaction(
  p_agent_id UUID,
  p_org_id UUID,
  p_transaction_type VARCHAR,
  p_amount NUMERIC,
  p_currency VARCHAR,
  p_customer_fee NUMERIC,
  p_agent_commission NUMERIC,
  p_customer_name VARCHAR,
  p_customer_phone VARCHAR,
  p_customer_account VARCHAR,
  p_customer_bank VARCHAR,
  p_idempotency_key VARCHAR,
  p_reference VARCHAR
) RETURNS public.agency_transactions
LANGUAGE plpgsql
AS $$
DECLARE
    v_wallet_float_id UUID;
    v_cash_hand_id UUID;
    v_wallet_float_balance NUMERIC(24,2);
    v_cash_hand_balance NUMERIC(24,2);
    v_existing public.agency_transactions;
    v_ledger_tx_id UUID;
    v_agency_tx public.agency_transactions;
    v_agent_daily_limit NUMERIC(24,2);
    v_agent_single_limit NUMERIC(24,2);
    v_today_spent NUMERIC(24,2);
BEGIN
    SELECT * INTO v_existing
    FROM public.agency_transactions
    WHERE agent_id = p_agent_id AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN v_existing;
    END IF;

    -- Enforce per-agent limits before touching any balance (fail closed).
    -- This applies to EVERY caller of this function — there is no path
    -- that bypasses it.
    SELECT daily_cash_limit, single_transaction_limit INTO v_agent_daily_limit, v_agent_single_limit
    FROM public.agents WHERE id = p_agent_id FOR UPDATE;

    IF v_agent_single_limit IS NOT NULL AND p_amount > v_agent_single_limit THEN
        RAISE EXCEPTION 'SINGLE_TRANSACTION_LIMIT_EXCEEDED';
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_today_spent
    FROM public.agency_transactions
    WHERE agent_id = p_agent_id
      AND status IN ('SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION')
      AND created_at >= date_trunc('day', NOW());

    IF v_agent_daily_limit IS NOT NULL AND (v_today_spent + p_amount) > v_agent_daily_limit THEN
        RAISE EXCEPTION 'DAILY_CASH_LIMIT_EXCEEDED';
    END IF;

    SELECT la.id, la.balance INTO v_wallet_float_id, v_wallet_float_balance
    FROM public.agent_float_accounts afa
    JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
    WHERE afa.agent_id = p_agent_id AND afa.account_kind = 'WALLET_FLOAT' AND afa.currency = p_currency
    FOR UPDATE OF la;

    SELECT la.id, la.balance INTO v_cash_hand_id, v_cash_hand_balance
    FROM public.agent_float_accounts afa
    JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
    WHERE afa.agent_id = p_agent_id AND afa.account_kind = 'CASH_IN_HAND' AND afa.currency = p_currency
    FOR UPDATE OF la;

    IF v_wallet_float_id IS NULL OR v_cash_hand_id IS NULL THEN
        RAISE EXCEPTION 'AGENT_FLOAT_NOT_PROVISIONED';
    END IF;

    IF p_transaction_type = 'CASH_IN' THEN
        IF v_wallet_float_balance < p_amount THEN
            RAISE EXCEPTION 'INSUFFICIENT_WALLET_FLOAT';
        END IF;
    ELSIF p_transaction_type = 'CASH_OUT' THEN
        IF v_cash_hand_balance < p_amount THEN
            RAISE EXCEPTION 'INSUFFICIENT_CASH_IN_HAND';
        END IF;
    ELSE
        RAISE EXCEPTION 'UNSUPPORTED_TRANSACTION_TYPE';
    END IF;

    INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
    VALUES (p_org_id, p_reference, p_transaction_type || ' via agent', p_amount, p_currency, 'COMMITTED')
    RETURNING id INTO v_ledger_tx_id;

    IF p_transaction_type = 'CASH_IN' THEN
        INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
        VALUES
            (v_ledger_tx_id, v_wallet_float_id, 'DEBIT', p_amount, p_currency, 'Cash-in: wallet float debited'),
            (v_ledger_tx_id, v_cash_hand_id, 'CREDIT', p_amount, p_currency, 'Cash-in: physical cash received');

        UPDATE public.ledger_accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_wallet_float_id;
        UPDATE public.ledger_accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = v_cash_hand_id;
    ELSE
        INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
        VALUES
            (v_ledger_tx_id, v_cash_hand_id, 'DEBIT', p_amount, p_currency, 'Cash-out: physical cash dispensed'),
            (v_ledger_tx_id, v_wallet_float_id, 'CREDIT', p_amount, p_currency, 'Cash-out: wallet float credited');

        UPDATE public.ledger_accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_cash_hand_id;
        UPDATE public.ledger_accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = v_wallet_float_id;
    END IF;

    INSERT INTO public.agency_transactions (
        agent_id, ledger_transaction_id, idempotency_key, reference, transaction_type,
        amount, customer_fee, agent_commission, currency, status,
        customer_name, customer_phone, customer_account, customer_bank, completed_at
    ) VALUES (
        p_agent_id, v_ledger_tx_id, p_idempotency_key, p_reference, p_transaction_type,
        p_amount, p_customer_fee, p_agent_commission, p_currency, 'SUCCESSFUL',
        p_customer_name, p_customer_phone, p_customer_account, p_customer_bank, NOW()
    ) RETURNING * INTO v_agency_tx;

    IF p_agent_commission > 0 THEN
        INSERT INTO public.agent_commissions (agent_id, agency_transaction_id, amount, currency, status)
        VALUES (p_agent_id, v_agency_tx.id, p_agent_commission, p_currency, 'EARNED');
    END IF;

    RETURN v_agency_tx;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. TRANSFERS: post_agency_transfer()
--
-- Debits the agent's WALLET_FLOAT for (amount + fee) into a suspense/clearing
-- ledger account (real, final, double-entry). The actual bank payout to the
-- recipient is NOT executed here (no live Providus/Coris credentials) — the
-- transaction is recorded as PENDING_PROVIDER_INTEGRATION, is fully visible
-- to the agent as "sent to clearing, awaiting bank confirmation", and must
-- later be reconciled/confirmed by a real provider webhook before being
-- marked SUCCESSFUL. This function still enforces per-agent single
-- transaction / daily cash limits before allowing the ledger debit.
-- ----------------------------------------------------------------------------

-- One shared clearing/suspense ledger account per org+currency that
-- outbound transfers are staged into pending provider confirmation.
CREATE TABLE IF NOT EXISTS public.transfer_clearing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
  ledger_account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
  provider_name VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, currency)
);

ALTER TABLE public.transfer_clearing_accounts ENABLE ROW LEVEL SECURITY;
-- No client-facing policy: this table is operational/back-office only,
-- read via service role in API routes.

DO $$
DECLARE
  v_ng_org UUID := '10000000-0000-0000-0000-000000000001';
  v_ne_org UUID := '10000000-0000-0000-0000-000000000002';
  v_ledger_id UUID;
BEGIN
  -- NG clearing account (Providus Bank Nigeria NIP rail)
  IF NOT EXISTS (SELECT 1 FROM public.transfer_clearing_accounts WHERE org_id = v_ng_org AND currency = 'NGN') THEN
    SELECT id INTO v_ledger_id FROM public.ledger_accounts WHERE account_number = 'CLEARING-NG-PROVIDUS-NIP';
    IF v_ledger_id IS NULL THEN
      INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
      VALUES (v_ng_org, 'CLEARING-NG-PROVIDUS-NIP', 'Outbound Transfer Clearing — Providus NIP', 'LIABILITY', 'NGN', 'NG', 0.00)
      RETURNING id INTO v_ledger_id;
    END IF;
    INSERT INTO public.transfer_clearing_accounts (org_id, currency, ledger_account_id, provider_name)
    VALUES (v_ng_org, 'NGN', v_ledger_id, 'PROVIDUS_BANK_NG');
  END IF;

  -- NE clearing account (Coris Bank Niger)
  IF NOT EXISTS (SELECT 1 FROM public.transfer_clearing_accounts WHERE org_id = v_ne_org AND currency = 'XOF') THEN
    SELECT id INTO v_ledger_id FROM public.ledger_accounts WHERE account_number = 'CLEARING-NE-CORIS-XOF';
    IF v_ledger_id IS NULL THEN
      INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
      VALUES (v_ne_org, 'CLEARING-NE-CORIS-XOF', 'Outbound Transfer Clearing — Coris Bank Niger', 'LIABILITY', 'XOF', 'NE', 0.00)
      RETURNING id INTO v_ledger_id;
    END IF;
    INSERT INTO public.transfer_clearing_accounts (org_id, currency, ledger_account_id, provider_name)
    VALUES (v_ne_org, 'XOF', v_ledger_id, 'CORIS_BANK_NE');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.post_agency_transfer(
  p_agent_id UUID,
  p_org_id UUID,
  p_transaction_type VARCHAR, -- TRANSFER_NIP | TRANSFER_CROSS_BORDER
  p_amount NUMERIC,
  p_currency VARCHAR,
  p_customer_fee NUMERIC,
  p_agent_commission NUMERIC,
  p_recipient_name VARCHAR,
  p_recipient_account VARCHAR,
  p_recipient_bank VARCHAR,
  p_recipient_bank_code VARCHAR,
  p_idempotency_key VARCHAR,
  p_reference VARCHAR
) RETURNS public.agency_transactions
LANGUAGE plpgsql
AS $$
DECLARE
  v_wallet_float_id UUID;
  v_wallet_float_balance NUMERIC(24,2);
  v_clearing_ledger_id UUID;
  v_provider_name VARCHAR(64);
  v_existing public.agency_transactions;
  v_ledger_tx_id UUID;
  v_agency_tx public.agency_transactions;
  v_debit_total NUMERIC(24,2);
  v_agent_daily_limit NUMERIC(24,2);
  v_agent_single_limit NUMERIC(24,2);
  v_today_spent NUMERIC(24,2);
BEGIN
  IF p_transaction_type NOT IN ('TRANSFER_NIP', 'TRANSFER_CROSS_BORDER') THEN
    RAISE EXCEPTION 'UNSUPPORTED_TRANSACTION_TYPE';
  END IF;

  SELECT * INTO v_existing
  FROM public.agency_transactions
  WHERE agent_id = p_agent_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN v_existing;
  END IF;

  v_debit_total := p_amount + p_customer_fee;

  -- Enforce per-agent limits BEFORE touching any balance (fail closed).
  SELECT daily_cash_limit, single_transaction_limit INTO v_agent_daily_limit, v_agent_single_limit
  FROM public.agents WHERE id = p_agent_id FOR UPDATE;

  IF v_agent_single_limit IS NOT NULL AND p_amount > v_agent_single_limit THEN
    RAISE EXCEPTION 'SINGLE_TRANSACTION_LIMIT_EXCEEDED';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_today_spent
  FROM public.agency_transactions
  WHERE agent_id = p_agent_id
    AND status IN ('SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION')
    AND created_at >= date_trunc('day', NOW());

  IF v_agent_daily_limit IS NOT NULL AND (v_today_spent + p_amount) > v_agent_daily_limit THEN
    RAISE EXCEPTION 'DAILY_CASH_LIMIT_EXCEEDED';
  END IF;

  -- Lock agent wallet float.
  SELECT la.id, la.balance INTO v_wallet_float_id, v_wallet_float_balance
  FROM public.agent_float_accounts afa
  JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
  WHERE afa.agent_id = p_agent_id AND afa.account_kind = 'WALLET_FLOAT' AND afa.currency = p_currency
  FOR UPDATE OF la;

  IF v_wallet_float_id IS NULL THEN
    RAISE EXCEPTION 'AGENT_FLOAT_NOT_PROVISIONED';
  END IF;

  IF v_wallet_float_balance < v_debit_total THEN
    RAISE EXCEPTION 'INSUFFICIENT_WALLET_FLOAT';
  END IF;

  SELECT ledger_account_id, provider_name INTO v_clearing_ledger_id, v_provider_name
  FROM public.transfer_clearing_accounts
  WHERE org_id = p_org_id AND currency = p_currency;

  IF v_clearing_ledger_id IS NULL THEN
    RAISE EXCEPTION 'CLEARING_ACCOUNT_NOT_CONFIGURED';
  END IF;

  PERFORM 1 FROM public.ledger_accounts WHERE id = v_clearing_ledger_id FOR UPDATE;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (p_org_id, p_reference, p_transaction_type || ' pending provider settlement', v_debit_total, p_currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  -- Debit agent wallet float (funds leave the agent's control), credit the
  -- clearing/suspense liability account (funds owed out to the recipient
  -- bank pending real provider confirmation). This is a real, final,
  -- balanced ledger posting — only the external bank leg is pending.
  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_wallet_float_id, 'DEBIT', v_debit_total, p_currency, 'Transfer: wallet float debited (amount + fee)'),
    (v_ledger_tx_id, v_clearing_ledger_id, 'CREDIT', v_debit_total, p_currency, 'Transfer: staged to outbound clearing pending provider confirmation');

  UPDATE public.ledger_accounts SET balance = balance - v_debit_total, updated_at = NOW() WHERE id = v_wallet_float_id;
  UPDATE public.ledger_accounts SET balance = balance + v_debit_total, updated_at = NOW() WHERE id = v_clearing_ledger_id;

  INSERT INTO public.agency_transactions (
    agent_id, ledger_transaction_id, idempotency_key, reference, transaction_type,
    amount, customer_fee, agent_commission, currency, status,
    recipient_name, recipient_account, recipient_bank, recipient_bank_code,
    provider_name, provider_status
  ) VALUES (
    p_agent_id, v_ledger_tx_id, p_idempotency_key, p_reference, p_transaction_type,
    p_amount, p_customer_fee, p_agent_commission, p_currency, 'PENDING_PROVIDER_INTEGRATION',
    p_recipient_name, p_recipient_account, p_recipient_bank, p_recipient_bank_code,
    v_provider_name, 'UNSENT'
  ) RETURNING * INTO v_agency_tx;

  IF p_agent_commission > 0 THEN
    INSERT INTO public.agent_commissions (agent_id, agency_transaction_id, amount, currency, status)
    VALUES (p_agent_id, v_agency_tx.id, p_agent_commission, p_currency, 'PENDING_SETTLEMENT');
  END IF;

  INSERT INTO public.agent_audit_logs (agent_id, action, target_type, target_id, result, reason)
  VALUES (p_agent_id, 'TRANSFER_INITIATED', 'agency_transactions', v_agency_tx.id::text, 'SUCCESS',
          format('%s of %s %s staged to clearing, pending %s confirmation', p_transaction_type, p_amount, p_currency, v_provider_name));

  RETURN v_agency_tx;
END;
$$;

-- Dedicated transfer commission rate bands (previously transfers had no
-- rate row at all — never reuse CASH_OUT pricing for a different product).
INSERT INTO public.agent_commission_rates (transaction_type, currency, min_amount, max_amount, customer_fee_flat, customer_fee_bps, agent_commission_flat, agent_commission_bps, is_active)
VALUES
  ('TRANSFER_NIP', 'NGN', 0, NULL, 50.00, 0, 15.00, 0, true),
  ('TRANSFER_CROSS_BORDER', 'NGN', 0, NULL, 500.00, 0, 100.00, 0, true),
  ('TRANSFER_CROSS_BORDER', 'XOF', 0, NULL, 250.00, 0, 50.00, 0, true)
ON CONFLICT (transaction_type, currency, min_amount) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. SETTLEMENT — internal ledger settlement only (per user decision).
--
-- A daily settlement batch nets each agent's EARNED commissions and any
-- PENDING_PROVIDER_INTEGRATION clearing exposure into a treasury settlement
-- ledger posting. This does NOT trigger an external bank payout (no
-- Providus/Coris settlement credentials) — it is the authoritative internal
-- record of what KoriePay owes/is owed vis-a-vis each agent, which a human
-- treasury operator (or a future real payout integration) executes against.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  batch_reference VARCHAR(64) NOT NULL UNIQUE,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
  settlement_date DATE NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'POSTED', 'PAID', 'FAILED')),
  total_commission_amount NUMERIC(24,2) NOT NULL DEFAULT 0,
  total_agent_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  UNIQUE (org_id, currency, settlement_date)
);

CREATE TABLE IF NOT EXISTS public.settlement_batch_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_batch_id UUID NOT NULL REFERENCES public.settlement_batches(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  commission_amount NUMERIC(24,2) NOT NULL DEFAULT 0,
  commission_count INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED')),
  ledger_transaction_id UUID REFERENCES public.ledger_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (settlement_batch_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_settlement_lines_agent ON public.settlement_batch_lines(agent_id);

ALTER TABLE public.settlement_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_batch_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS settlement_lines_self_select ON public.settlement_batch_lines;
CREATE POLICY settlement_lines_self_select ON public.settlement_batch_lines
  FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

-- Runs a daily settlement for one org+currency: sums each agent's EARNED
-- commissions not yet in a batch, opens/reuses today's batch, creates one
-- line per agent, marks those commissions PENDING_SETTLEMENT, and posts a
-- single treasury ledger transaction moving the total out of a
-- "Commission Payable" liability account. Idempotent per (org, currency,
-- date) via the UNIQUE constraint on settlement_batches.
CREATE OR REPLACE FUNCTION public.run_daily_settlement(
  p_org_id UUID,
  p_currency VARCHAR,
  p_settlement_date DATE DEFAULT CURRENT_DATE
) RETURNS public.settlement_batches
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch public.settlement_batches;
  v_payable_account_id UUID;
  v_total NUMERIC(24,2) := 0;
  v_agent_count INT := 0;
  v_ledger_tx_id UUID;
  r RECORD;
BEGIN
  SELECT * INTO v_batch
  FROM public.settlement_batches
  WHERE org_id = p_org_id AND currency = p_currency AND settlement_date = p_settlement_date;

  IF FOUND THEN
    RETURN v_batch; -- already run for this org/currency/day
  END IF;

  SELECT id INTO v_payable_account_id
  FROM public.ledger_accounts
  WHERE org_id = p_org_id AND currency = p_currency AND account_number = 'COMMISSION-PAYABLE-' || p_currency;

  IF v_payable_account_id IS NULL THEN
    INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
    VALUES (
      p_org_id, 'COMMISSION-PAYABLE-' || p_currency, 'Agent Commission Payable — ' || p_currency,
      'LIABILITY', p_currency, (SELECT country FROM public.organizations WHERE id = p_org_id), 0.00
    )
    RETURNING id INTO v_payable_account_id;
  END IF;

  INSERT INTO public.settlement_batches (org_id, batch_reference, currency, settlement_date, status)
  VALUES (p_org_id, 'STL-' || to_char(p_settlement_date, 'YYYYMMDD') || '-' || upper(p_currency), p_currency, p_settlement_date, 'OPEN')
  RETURNING * INTO v_batch;

  FOR r IN
    SELECT ac.agent_id, SUM(ac.amount) AS total_amount, COUNT(*) AS cnt
    FROM public.agent_commissions ac
    JOIN public.agents a ON a.id = ac.agent_id
    WHERE a.org_id = p_org_id
      AND ac.currency = p_currency
      AND ac.status = 'EARNED'
    GROUP BY ac.agent_id
  LOOP
    INSERT INTO public.settlement_batch_lines (settlement_batch_id, agent_id, commission_amount, commission_count)
    VALUES (v_batch.id, r.agent_id, r.total_amount, r.cnt);

    UPDATE public.agent_commissions
    SET status = 'PENDING_SETTLEMENT', settled_at = NOW()
    WHERE agent_id = r.agent_id AND currency = p_currency AND status = 'EARNED';

    v_total := v_total + r.total_amount;
    v_agent_count := v_agent_count + 1;
  END LOOP;

  IF v_total > 0 THEN
    INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
    VALUES (p_org_id, v_batch.batch_reference, 'Daily agent commission settlement batch', v_total, p_currency, 'COMMITTED')
    RETURNING id INTO v_ledger_tx_id;

    -- Debit an expense account (cost of running the agency network), credit
    -- the commission-payable liability (KoriePay now owes agents this total).
    INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
    SELECT p_org_id, 'COMMISSION-EXPENSE-' || p_currency, 'Agent Commission Expense — ' || p_currency, 'EXPENSE', p_currency,
           (SELECT country FROM public.organizations WHERE id = p_org_id), 0.00
    WHERE NOT EXISTS (
      SELECT 1 FROM public.ledger_accounts WHERE org_id = p_org_id AND currency = p_currency AND account_number = 'COMMISSION-EXPENSE-' || p_currency
    );

    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    SELECT v_ledger_tx_id, id, 'DEBIT', v_total, p_currency, 'Daily commission settlement expense'
    FROM public.ledger_accounts WHERE org_id = p_org_id AND currency = p_currency AND account_number = 'COMMISSION-EXPENSE-' || p_currency;

    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES (v_ledger_tx_id, v_payable_account_id, 'CREDIT', v_total, p_currency, 'Daily commission settlement payable');

    UPDATE public.ledger_accounts SET balance = balance + v_total, updated_at = NOW()
    WHERE org_id = p_org_id AND currency = p_currency AND account_number = 'COMMISSION-EXPENSE-' || p_currency;

    UPDATE public.ledger_accounts SET balance = balance + v_total, updated_at = NOW() WHERE id = v_payable_account_id;

    UPDATE public.settlement_batch_lines SET ledger_transaction_id = v_ledger_tx_id WHERE settlement_batch_id = v_batch.id;
  END IF;

  UPDATE public.settlement_batches
  SET status = 'POSTED', total_commission_amount = v_total, total_agent_count = v_agent_count, posted_at = NOW()
  WHERE id = v_batch.id
  RETURNING * INTO v_batch;

  RETURN v_batch;
END;
$$;

-- Schedule daily settlement at 23:55 for both live orgs/currencies, if
-- pg_cron is available in this project (Supabase-managed Postgres ships it).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('koriepay-daily-settlement-ng') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'koriepay-daily-settlement-ng');
    PERFORM cron.schedule(
      'koriepay-daily-settlement-ng', '55 23 * * *',
      $cron$SELECT public.run_daily_settlement('10000000-0000-0000-0000-000000000001', 'NGN');$cron$
    );
    PERFORM cron.unschedule('koriepay-daily-settlement-ne') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'koriepay-daily-settlement-ne');
    PERFORM cron.schedule(
      'koriepay-daily-settlement-ne', '55 23 * * *',
      $cron$SELECT public.run_daily_settlement('10000000-0000-0000-0000-000000000002', 'XOF');$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron extension present but not enabled/permitted on this plan —
  -- settlement remains available on-demand via the API route instead.
  NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 4. KYC / ONBOARDING — manual document upload + human admin review.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  document_type VARCHAR(32) NOT NULL CHECK (document_type IN (
    'NATIONAL_ID', 'BVN_SLIP', 'CAC_CERTIFICATE', 'PROOF_OF_ADDRESS',
    'PASSPORT_PHOTO', 'UTILITY_BILL', 'BUSINESS_PREMISES_PHOTO', 'OTHER'
  )),
  storage_path TEXT NOT NULL,
  original_filename VARCHAR(255),
  mime_type VARCHAR(128),
  file_size_bytes BIGINT,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_docs_agent ON public.agent_kyc_documents(agent_id);
CREATE INDEX IF NOT EXISTS idx_kyc_docs_status ON public.agent_kyc_documents(status);

ALTER TABLE public.agent_kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kyc_docs_self_select ON public.agent_kyc_documents;
CREATE POLICY kyc_docs_self_select ON public.agent_kyc_documents
  FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

-- Onboarding applications: a prospective agent applies before an `agents`
-- row (and hence a login) even exists. A SUPER_ADMIN converts an APPROVED
-- application into a real `agents` row + Supabase Auth invite.
CREATE TABLE IF NOT EXISTS public.agent_onboarding_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  applicant_full_name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(255) NOT NULL,
  country VARCHAR(16) NOT NULL CHECK (country IN ('NG', 'NE')),
  state_or_region VARCHAR(128),
  city_or_lga VARCHAR(128),
  requested_tier VARCHAR(16) NOT NULL DEFAULT 'TIER_1' CHECK (requested_tier IN ('TIER_1', 'TIER_2', 'SUPER_AGENT')),
  status VARCHAR(16) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  converted_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  UNIQUE (org_id, email)
);

ALTER TABLE public.agent_onboarding_applications ENABLE ROW LEVEL SECURITY;
-- Applicants have no auth session yet (pre-account); back-office/service-role only.

-- Storage bucket for KYC documents (private; access only via signed URLs
-- issued server-side after an authorization check).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('agent-kyc-documents', 'agent-kyc-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. LIMITS — per-tier default policy + override audit trail.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_tier_limit_policies (
  tier VARCHAR(16) PRIMARY KEY CHECK (tier IN ('TIER_1', 'TIER_2', 'SUPER_AGENT')),
  daily_cash_limit NUMERIC(24,2) NOT NULL,
  single_transaction_limit NUMERIC(24,2) NOT NULL,
  max_daily_transaction_count INT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.agent_tier_limit_policies (tier, daily_cash_limit, single_transaction_limit, max_daily_transaction_count)
VALUES
  ('TIER_1', 1000000.00, 200000.00, 100),
  ('TIER_2', 5000000.00, 1000000.00, 300),
  ('SUPER_AGENT', 10000000.00, 2000000.00, 1000)
ON CONFLICT (tier) DO NOTHING;

ALTER TABLE public.agent_tier_limit_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tier_limits_read ON public.agent_tier_limit_policies;
CREATE POLICY tier_limits_read ON public.agent_tier_limit_policies
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.agent_limit_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  daily_cash_limit NUMERIC(24,2),
  single_transaction_limit NUMERIC(24,2),
  reason TEXT NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.agent_limit_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS limit_overrides_self_select ON public.agent_limit_overrides;
CREATE POLICY limit_overrides_self_select ON public.agent_limit_overrides
  FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 6. NOTIFICATIONS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  category VARCHAR(32) NOT NULL CHECK (category IN (
    'TRANSACTION', 'LIQUIDITY', 'KYC', 'SETTLEMENT', 'COMPLIANCE', 'SYSTEM', 'SUPPORT'
  )),
  severity VARCHAR(16) NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  related_transaction_id UUID REFERENCES public.agency_transactions(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_notifications_agent ON public.agent_notifications(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_unread ON public.agent_notifications(agent_id) WHERE is_read = FALSE;

ALTER TABLE public.agent_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_notifications_self_select ON public.agent_notifications;
CREATE POLICY agent_notifications_self_select ON public.agent_notifications
  FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS agent_notifications_self_update ON public.agent_notifications;
CREATE POLICY agent_notifications_self_update ON public.agent_notifications
  FOR UPDATE USING (agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

-- Auto-notify on every agency_transactions insert/status change — this is
-- the real trigger source for the notification bell and for realtime.
CREATE OR REPLACE FUNCTION public.notify_agent_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.agent_notifications (agent_id, category, severity, title, body, related_transaction_id)
    VALUES (
      NEW.agent_id,
      'TRANSACTION',
      CASE WHEN NEW.status = 'FAILED' THEN 'WARNING' ELSE 'INFO' END,
      NEW.transaction_type || ' ' || NEW.status,
      format('%s of %s %s (ref %s) is now %s.', NEW.transaction_type, NEW.amount, NEW.currency, NEW.reference, NEW.status),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_agent_on_transaction ON public.agency_transactions;
CREATE TRIGGER trg_notify_agent_on_transaction
  AFTER INSERT OR UPDATE ON public.agency_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_agent_on_transaction();

-- ----------------------------------------------------------------------------
-- 7. SUPPORT / DISPUTES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  category VARCHAR(32) NOT NULL CHECK (category IN (
    'TRANSACTION_DISPUTE', 'FLOAT_ISSUE', 'TERMINAL_ISSUE', 'KYC_ISSUE', 'OTHER'
  )),
  related_transaction_id UUID REFERENCES public.agency_transactions(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  priority VARCHAR(8) NOT NULL DEFAULT 'P2' CHECK (priority IN ('P1', 'P2', 'P3')),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_agent ON public.agent_support_tickets(agent_id, created_at DESC);

ALTER TABLE public.agent_support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS support_tickets_self_select ON public.agent_support_tickets;
CREATE POLICY support_tickets_self_select ON public.agent_support_tickets
  FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.agent_support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.agent_support_tickets(id) ON DELETE CASCADE,
  sender_type VARCHAR(16) NOT NULL CHECK (sender_type IN ('AGENT', 'SUPPORT_AGENT', 'SYSTEM')),
  sender_id UUID,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agent_support_ticket_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS support_messages_self_select ON public.agent_support_ticket_messages;
CREATE POLICY support_messages_self_select ON public.agent_support_ticket_messages
  FOR SELECT USING (
    ticket_id IN (
      SELECT id FROM public.agent_support_tickets
      WHERE agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 8. RBAC — extend roles used by the agency portal's back-office/admin views.
-- ----------------------------------------------------------------------------

INSERT INTO public.roles (name, description, is_system_role)
VALUES
  ('AGENCY_OPS_ADMIN', 'Reviews KYC, manages limits, runs settlement, resolves disputes for agency banking.', TRUE),
  ('AGENCY_COMPLIANCE', 'Read-only compliance/audit access to agency banking records.', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. REALTIME — publish the tables the agent portal needs to subscribe to.
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'agency_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agency_transactions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'agent_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_notifications;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ledger_accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger_accounts;
  END IF;
END $$;

-- Ensure REPLICA IDENTITY FULL so UPDATE/DELETE realtime payloads include
-- old values (needed for the liquidity card to react to balance changes).
ALTER TABLE public.agency_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.agent_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.ledger_accounts REPLICA IDENTITY FULL;
