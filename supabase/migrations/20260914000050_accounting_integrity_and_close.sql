-- =============================================================================
-- 20260914000050_accounting_integrity_and_close.sql
--
-- Accounting-integrity remediation for the KoriePay ledger, per the findings of
-- the 2026-09-14 Banking & Accounting Assessment (blockers B1, B2, B6, B9 and
-- related risks RISK-01/17/18/29/30).
--
-- What this migration does (in order):
--   S1  Correct verify_double_entry_balance (NUMERIC sums; was integer-cast).
--   S2  Replace posting functions:
--         - post_customer_transfer          : fee split out of clearing into
--                                             TRANSFER-FEE-DEFERRED (unearned)
--         - post_agency_cash_transaction    : fee + commission legs journalised
--         - confirm_merchant_collection     : gross posting + fee revenue leg
--         - run_merchant_settlement         : settlement journal to payout
--                                             clearing + ledger_transaction_id
--         - run_daily_settlement            : payable settled to agent float,
--                                             commissions marked PAID
--         - approve_agent_float_topup       : SIGN FIX (treasury leg debited,
--                                             balance now DECREASES)
--         - post_adashi_contribution_agent_collect : SIGN FIX (agent cash leg
--                                             debited, balance now DECREASES)
--         - _execute_adashi_payout_disbursement : escrow sufficiency floor
--   S3  Trigger functions: balance-derivation checks, wallet/ledger sync,
--       zero-opening-balance enforcement, FX governance, merchant cancel guard.
--   S4  fx_rate_history + fx_rates governance trigger (actor + reciprocity).
--   S5  Merchant transaction cancellation guard (no cancelling settled txns).
--   S6  post_adjustment_journal + post_funding_journal (sanctioned, audited).
--   S7  recalculate_all_balances() — restate stored balances from the journal.
--   S8  Provision repair/suspense accounts (zero-opening).
--   S9  Repairs: restate balances; post historical adjustment journals
--       (agency fees NGN 200, commission accrual NGN 60, Adashi escrow
--       operational loss NGN 60,000); un-stamp non-settled txns from FAILED
--       merchant batches.
--   S10 CHECK floors: ESCROW / FX-BOOK accounts can never go negative.
--   S11 Attach DEFERRABLE INITIALLY DEFERRED constraint triggers:
--         - ledger_transactions: journal must balance (B2)
--         - ledger_entries: touched account must satisfy stored = derived (B1)
--         - ledger_accounts: stored balance must equal journal-derived (B1)
--         - wallets: wallet balance must equal linked ledger account (B1)
--       plus immediate zero-opening-balance guards (kills the XOF-597 class).
--   S12 generate_trial_balance().
--   S13 run_daily_financial_close() — automated daily close writing
--       daily_financial_closes (B9).
--   S14 Run the first close.
--
-- Conventions (system-wide, credit-positive):
--   DEBIT  => balance decreases.  CREDIT => balance increases.
--   stored ledger_accounts.balance MUST equal SUM(credits) - SUM(debits).
--   No function signature changed — app RPC calls keep working.
-- =============================================================================

-- =============================================================================
-- S1. Double-entry verification function (corrected NUMERIC aggregation)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.verify_double_entry_balance() RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_debits  NUMERIC(24,2);
  v_credits NUMERIC(24,2);
BEGIN
  SELECT COALESCE(SUM(CASE WHEN entry_type = 'DEBIT'  THEN amount ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0)
  INTO v_debits, v_credits
  FROM public.ledger_entries
  WHERE transaction_id = NEW.id;

  IF v_debits <> v_credits THEN
    RAISE EXCEPTION 'LEDGER_TRANSACTION_NOT_BALANCED: transaction % has debits % vs credits %',
      NEW.id, v_debits, v_credits;
  END IF;
  RETURN NULL;
END;
$function$;

-- =============================================================================
-- S2. Posting functions (sign-correct, fee/commission-journalising)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- S2.1 post_customer_transfer — v2
--   Fee is no longer lumped into outbound clearing: the principal is staged to
--   clearing and the fee is parked in TRANSFER-FEE-DEFERRED-<ccy> (liability,
--   unearned) until provider execution recognises it via
--   recognize_transfer_fee_revenue(). Signature unchanged.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_customer_transfer(p_customer_id uuid, p_org_id uuid, p_wallet_id uuid, p_transaction_type character varying, p_amount numeric, p_currency character varying, p_fee numeric, p_destination_currency character varying, p_exchange_rate numeric, p_destination_amount numeric, p_recipient_name character varying, p_recipient_account character varying, p_recipient_bank character varying, p_recipient_bank_code character varying, p_narration text, p_idempotency_key character varying, p_reference character varying)
 RETURNS customer_transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet public.wallets;
  v_wallet_ledger_balance NUMERIC(24,2);
  v_clearing_ledger_id UUID;
  v_fee_deferred_id UUID;
  v_fee NUMERIC(24,2);
  v_provider_name VARCHAR(64);
  v_existing public.customer_transactions;
  v_ledger_tx_id UUID;
  v_customer_tx public.customer_transactions;
  v_debit_total NUMERIC(24,2);
  v_today_spent NUMERIC(24,2);
  v_kyc_tier VARCHAR(16);
  v_tier_limit RECORD;
  v_tier_consumed NUMERIC(24,2);
BEGIN
  IF p_transaction_type NOT IN ('TRANSFER_NIP', 'TRANSFER_CROSS_BORDER') THEN
    RAISE EXCEPTION 'UNSUPPORTED_TRANSACTION_TYPE';
  END IF;

  SELECT * INTO v_existing
  FROM public.customer_transactions
  WHERE customer_id = p_customer_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  v_fee := COALESCE(p_fee, 0);
  v_debit_total := p_amount + v_fee;

  SELECT * INTO v_wallet FROM public.wallets WHERE id = p_wallet_id AND customer_id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;
  IF v_wallet.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'WALLET_NOT_ACTIVE';
  END IF;
  IF v_wallet.ledger_account_id IS NULL THEN
    RAISE EXCEPTION 'WALLET_NOT_PROVISIONED';
  END IF;

  -- ---- Tier-based compliance ceiling ----
  SELECT kyc_tier INTO v_kyc_tier FROM public.customers WHERE id = p_customer_id FOR UPDATE;

  SELECT * INTO v_tier_limit
  FROM public.kyc_tier_volume_limits
  WHERE currency = p_currency AND kyc_tier = COALESCE(v_kyc_tier, 'TIER_0');

  IF FOUND AND v_tier_limit.volume_limit_major IS NOT NULL THEN
    IF v_tier_limit.volume_limit_major = 0 THEN
      RAISE EXCEPTION 'TIER_NOT_PERMITTED_TO_TRANSACT';
    END IF;
    v_tier_consumed := public.get_customer_tier_volume_consumed(p_customer_id, p_currency, v_tier_limit.window_unit);
    IF (v_tier_consumed + v_debit_total) > v_tier_limit.volume_limit_major THEN
      RAISE EXCEPTION 'TIER_VOLUME_LIMIT_EXCEEDED';
    END IF;
  END IF;

  SELECT balance INTO v_wallet_ledger_balance
  FROM public.ledger_accounts WHERE id = v_wallet.ledger_account_id FOR UPDATE;

  IF v_wallet_ledger_balance < v_debit_total THEN
    RAISE EXCEPTION 'INSUFFICIENT_WALLET_BALANCE';
  END IF;

  -- Flat wallet daily_limit remains a secondary, per-wallet guard rail.
  SELECT COALESCE(SUM(amount + fee), 0) INTO v_today_spent
  FROM public.customer_transactions
  WHERE wallet_id = p_wallet_id
    AND status IN ('SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION')
    AND created_at >= date_trunc('day', NOW());

  IF (v_today_spent + v_debit_total) > v_wallet.daily_limit THEN
    RAISE EXCEPTION 'DAILY_LIMIT_EXCEEDED';
  END IF;

  SELECT ledger_account_id, provider_name INTO v_clearing_ledger_id, v_provider_name
  FROM public.transfer_clearing_accounts
  WHERE org_id = p_org_id AND currency = p_currency;

  IF v_clearing_ledger_id IS NULL THEN
    RAISE EXCEPTION 'CLEARING_ACCOUNT_NOT_CONFIGURED';
  END IF;

  PERFORM 1 FROM public.ledger_accounts WHERE id = v_clearing_ledger_id FOR UPDATE;

  -- Deferred (unearned) fee liability account — one per currency.
  IF v_fee > 0 THEN
    INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
    SELECT p_org_id, 'TRANSFER-FEE-DEFERRED-' || p_currency, 'Customer Transfer Fees Deferred (Unearned) — ' || p_currency, 'LIABILITY', p_currency,
           (SELECT country FROM public.organizations WHERE id = p_org_id), 0.00
    WHERE NOT EXISTS (
      SELECT 1 FROM public.ledger_accounts WHERE currency = p_currency AND account_number = 'TRANSFER-FEE-DEFERRED-' || p_currency
    );
    SELECT id INTO v_fee_deferred_id FROM public.ledger_accounts
    WHERE currency = p_currency AND account_number = 'TRANSFER-FEE-DEFERRED-' || p_currency;
  END IF;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (p_org_id, p_reference, p_transaction_type || ' pending provider settlement (customer)', v_debit_total, p_currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_wallet.ledger_account_id, 'DEBIT', v_debit_total, p_currency, 'Customer transfer: wallet debited (amount + fee)'),
    (v_ledger_tx_id, v_clearing_ledger_id, 'CREDIT', p_amount, p_currency, 'Customer transfer: principal staged to outbound clearing pending provider execution');

  IF v_fee > 0 THEN
    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES (v_ledger_tx_id, v_fee_deferred_id, 'CREDIT', v_fee, p_currency, 'Customer transfer fee deferred (unearned) until provider execution');
  END IF;

  UPDATE public.ledger_accounts SET balance = balance - v_debit_total, updated_at = NOW() WHERE id = v_wallet.ledger_account_id;
  UPDATE public.ledger_accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = v_clearing_ledger_id;
  IF v_fee > 0 THEN
    UPDATE public.ledger_accounts SET balance = balance + v_fee, updated_at = NOW() WHERE id = v_fee_deferred_id;
  END IF;

  UPDATE public.wallets SET balance = balance - v_debit_total, updated_at = NOW() WHERE id = p_wallet_id;

  INSERT INTO public.customer_transactions (
    customer_id, wallet_id, ledger_transaction_id, idempotency_key, reference, transaction_type,
    amount, fee, currency, destination_currency, exchange_rate, destination_amount, status,
    recipient_name, recipient_account, recipient_bank, recipient_bank_code,
    provider_name, provider_status, narration
  ) VALUES (
    p_customer_id, p_wallet_id, v_ledger_tx_id, p_idempotency_key, p_reference, p_transaction_type,
    p_amount, p_fee, p_currency, p_destination_currency, p_exchange_rate, p_destination_amount, 'PENDING_PROVIDER_INTEGRATION',
    p_recipient_name, p_recipient_account, p_recipient_bank, p_recipient_bank_code,
    v_provider_name, 'UNSENT', p_narration
  ) RETURNING * INTO v_customer_tx;

  RETURN v_customer_tx;
END;
$function$;

-- -----------------------------------------------------------------------------
-- S2.2 post_agency_cash_transaction — v2
--   Adds fee and commission legs to the SAME balanced multi-line journal:
--     fee       : DEBIT agent CASH_IN_HAND / CREDIT AGENCY-FEE-REVENUE-<ccy>
--                 (the agent collects the fee in cash and owes it to KoriePay)
--     commission: DEBIT COMMISSION-EXPENSE-<ccy> / CREDIT COMMISSION-PAYABLE-<ccy>
--   Signature unchanged.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_agency_cash_transaction(p_agent_id uuid, p_org_id uuid, p_transaction_type character varying, p_amount numeric, p_currency character varying, p_customer_fee numeric, p_agent_commission numeric, p_customer_name character varying, p_customer_phone character varying, p_customer_account character varying, p_customer_bank character varying, p_idempotency_key character varying, p_reference character varying)
 RETURNS agency_transactions
 LANGUAGE plpgsql
AS $function$
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
    v_fee NUMERIC(24,2);
    v_commission NUMERIC(24,2);
    v_fee_revenue_id UUID;
    v_commission_expense_id UUID;
    v_commission_payable_id UUID;
BEGIN
    v_fee := COALESCE(p_customer_fee, 0);
    v_commission := COALESCE(p_agent_commission, 0);

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

    -- Fee revenue account (one per currency).
    IF v_fee > 0 THEN
        INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
        SELECT p_org_id, 'AGENCY-FEE-REVENUE-' || p_currency, 'Agency Customer Fee Revenue — ' || p_currency, 'REVENUE', p_currency,
               (SELECT country FROM public.organizations WHERE id = p_org_id), 0.00
        WHERE NOT EXISTS (
            SELECT 1 FROM public.ledger_accounts WHERE currency = p_currency AND account_number = 'AGENCY-FEE-REVENUE-' || p_currency
        );
        SELECT id INTO v_fee_revenue_id FROM public.ledger_accounts
        WHERE currency = p_currency AND account_number = 'AGENCY-FEE-REVENUE-' || p_currency;
    END IF;

    -- Commission expense / payable accounts (one per currency).
    IF v_commission > 0 THEN
        INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
        SELECT p_org_id, 'COMMISSION-EXPENSE-' || p_currency, 'Agent Commission Expense — ' || p_currency, 'EXPENSE', p_currency,
               (SELECT country FROM public.organizations WHERE id = p_org_id), 0.00
        WHERE NOT EXISTS (
            SELECT 1 FROM public.ledger_accounts WHERE currency = p_currency AND account_number = 'COMMISSION-EXPENSE-' || p_currency
        );
        SELECT id INTO v_commission_expense_id FROM public.ledger_accounts
        WHERE currency = p_currency AND account_number = 'COMMISSION-EXPENSE-' || p_currency;

        INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
        SELECT p_org_id, 'COMMISSION-PAYABLE-' || p_currency, 'Agent Commission Payable — ' || p_currency, 'LIABILITY', p_currency,
               (SELECT country FROM public.organizations WHERE id = p_org_id), 0.00
        WHERE NOT EXISTS (
            SELECT 1 FROM public.ledger_accounts WHERE currency = p_currency AND account_number = 'COMMISSION-PAYABLE-' || p_currency
        );
        SELECT id INTO v_commission_payable_id FROM public.ledger_accounts
        WHERE currency = p_currency AND account_number = 'COMMISSION-PAYABLE-' || p_currency;
    END IF;

    INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
    VALUES (p_org_id, p_reference, p_transaction_type || ' via agent', p_amount + v_fee + v_commission, p_currency, 'COMMITTED')
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

    -- Fee leg: the agent collected the fee in cash and owes it to KoriePay,
    -- so the agent cash-in-hand position is debited (reduced) by the fee and
    -- agency fee revenue is credited.
    IF v_fee > 0 THEN
        INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
        VALUES (v_ledger_tx_id, v_cash_hand_id, 'DEBIT', v_fee, p_currency, 'Agency transaction fee collected in cash, owed to KoriePay');

        INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
        VALUES (v_ledger_tx_id, v_fee_revenue_id, 'CREDIT', v_fee, p_currency, 'Agency customer fee revenue recognised');

        UPDATE public.ledger_accounts SET balance = balance - v_fee, updated_at = NOW() WHERE id = v_cash_hand_id;
        UPDATE public.ledger_accounts SET balance = balance + v_fee, updated_at = NOW() WHERE id = v_fee_revenue_id;
    END IF;

    -- Commission legs: expense recognised and payable accrued at earning time,
    -- so the daily settlement run can only ever settle an already-funded
    -- payable (no more minting).
    IF v_commission > 0 THEN
        INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
        VALUES (v_ledger_tx_id, v_commission_expense_id, 'DEBIT', v_commission, p_currency, 'Agent commission expense recognised at earning');

        INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
        VALUES (v_ledger_tx_id, v_commission_payable_id, 'CREDIT', v_commission, p_currency, 'Agent commission payable accrued at earning');

        UPDATE public.ledger_accounts SET balance = balance - v_commission, updated_at = NOW() WHERE id = v_commission_expense_id;
        UPDATE public.ledger_accounts SET balance = balance + v_commission, updated_at = NOW() WHERE id = v_commission_payable_id;
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
$function$;

-- -----------------------------------------------------------------------------
-- S2.3 confirm_merchant_collection — v2
--   Posts GROSS: DEBIT collections clearing (gross) / CREDIT merchant
--   settlement (net) / CREDIT MERCHANT-FEE-REVENUE-<ccy> (fee). The fee is
--   earned at confirmation (cash changed hands at the till). Signature
--   unchanged.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_merchant_collection(p_transaction_id uuid, p_merchant_id uuid)
 RETURNS merchant_payment_transactions
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_tx public.merchant_payment_transactions;
  v_org_id UUID;
  v_settlement_account_id UUID;
  v_ledger_tx_id UUID;
  v_gross NUMERIC(24,2);
  v_net NUMERIC(24,2);
  v_fee NUMERIC(24,2);
  v_clearing_id UUID;
  v_fee_revenue_id UUID;
BEGIN
  SELECT * INTO v_tx FROM public.merchant_payment_transactions
  WHERE id = p_transaction_id AND merchant_id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COLLECTION_NOT_FOUND';
  END IF;

  IF v_tx.status = 'SUCCESSFUL' THEN
    RETURN v_tx; -- already confirmed, idempotent
  END IF;

  IF v_tx.status NOT IN ('PENDING_PROVIDER_INTEGRATION', 'PROCESSING') THEN
    RAISE EXCEPTION 'COLLECTION_NOT_CONFIRMABLE';
  END IF;

  SELECT org_id, settlement_ledger_account_id INTO v_org_id, v_settlement_account_id
  FROM public.merchant_profiles WHERE id = p_merchant_id;

  IF v_settlement_account_id IS NULL THEN
    RAISE EXCEPTION 'MERCHANT_SETTLEMENT_ACCOUNT_NOT_PROVISIONED';
  END IF;

  v_gross := v_tx.amount;
  v_net := v_tx.net_amount;
  v_fee := COALESCE(v_tx.fee, 0);

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_org_id, v_tx.reference, 'Merchant in-store collection — cashier confirmed (gross)', v_gross, v_tx.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
  SELECT v_org_id, 'MERCHANT-COLLECTIONS-CLEARING-' || v_tx.currency, 'Merchant Collections Clearing — ' || v_tx.currency, 'ASSET', v_tx.currency,
         (SELECT country FROM public.organizations WHERE id = v_org_id), 0.00
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ledger_accounts WHERE currency = v_tx.currency AND account_number = 'MERCHANT-COLLECTIONS-CLEARING-' || v_tx.currency
  );
  SELECT id INTO v_clearing_id FROM public.ledger_accounts
  WHERE currency = v_tx.currency AND account_number = 'MERCHANT-COLLECTIONS-CLEARING-' || v_tx.currency;

  IF v_fee > 0 THEN
    INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
    SELECT v_org_id, 'MERCHANT-FEE-REVENUE-' || v_tx.currency, 'Merchant Collection Fee Revenue — ' || v_tx.currency, 'REVENUE', v_tx.currency,
           (SELECT country FROM public.organizations WHERE id = v_org_id), 0.00
    WHERE NOT EXISTS (
      SELECT 1 FROM public.ledger_accounts WHERE currency = v_tx.currency AND account_number = 'MERCHANT-FEE-REVENUE-' || v_tx.currency
    );
    SELECT id INTO v_fee_revenue_id FROM public.ledger_accounts
    WHERE currency = v_tx.currency AND account_number = 'MERCHANT-FEE-REVENUE-' || v_tx.currency;
  END IF;

  -- Gross posting: the full amount collected at the till is an inflow; the
  -- merchant is owed the net and KoriePay has earned the fee.
  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES (v_ledger_tx_id, v_clearing_id, 'DEBIT', v_gross, v_tx.currency, 'In-store collection (gross) cleared to merchant settlement');

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES (v_ledger_tx_id, v_settlement_account_id, 'CREDIT', v_net, v_tx.currency, 'In-store collection credited to merchant settlement account (net of fee)');

  IF v_fee > 0 THEN
    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES (v_ledger_tx_id, v_fee_revenue_id, 'CREDIT', v_fee, v_tx.currency, 'Merchant collection fee revenue recognised at confirmation');
  END IF;

  UPDATE public.ledger_accounts SET balance = balance + v_net, updated_at = NOW() WHERE id = v_settlement_account_id;
  UPDATE public.ledger_accounts SET balance = balance - v_gross, updated_at = NOW() WHERE id = v_clearing_id;
  IF v_fee > 0 THEN
    UPDATE public.ledger_accounts SET balance = balance + v_fee, updated_at = NOW() WHERE id = v_fee_revenue_id;
  END IF;

  UPDATE public.merchant_payment_transactions
  SET status = 'SUCCESSFUL', ledger_transaction_id = v_ledger_tx_id, settled_at = NOW()
  WHERE id = p_transaction_id
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$function$;

-- -----------------------------------------------------------------------------
-- S2.4 run_merchant_settlement — v2
--   In addition to batching, posts the settlement journal:
--     DEBIT merchant settlement (net) / CREDIT MERCHANT-PAYOUT-CLEARING-<ccy>
--   with a funded-settlement sufficiency check, and stamps
--   merchant_settlement_batches.ledger_transaction_id. Signature unchanged.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_merchant_settlement(p_merchant_id uuid, p_currency character varying)
 RETURNS merchant_settlement_batches
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_batch public.merchant_settlement_batches;
  v_bank_name VARCHAR(128);
  v_account_number VARCHAR(32);
  v_org_id UUID;
  v_settlement_account_id UUID;
  v_settlement_balance NUMERIC(24,2);
  v_payout_clearing_id UUID;
  v_ledger_tx_id UUID;
  v_gross NUMERIC(24,2) := 0;
  v_fees NUMERIC(24,2) := 0;
  v_net NUMERIC(24,2) := 0;
  v_count INT := 0;
BEGIN
  -- Lock the merchant's settlement profile row. Any concurrent call for
  -- this same merchant now blocks here until this transaction commits or
  -- rolls back, and then re-evaluates against fresh (post-commit) state —
  -- closing the race without needing a new column or constraint.
  SELECT settlement_bank, settlement_account_number, org_id INTO v_bank_name, v_account_number, v_org_id
  FROM public.merchant_profiles WHERE id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MERCHANT_NOT_FOUND';
  END IF;

  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(fee), 0), COALESCE(SUM(net_amount), 0), COUNT(*)
  INTO v_gross, v_fees, v_net, v_count
  FROM public.merchant_payment_transactions
  WHERE merchant_id = p_merchant_id
    AND currency = p_currency
    AND status = 'SUCCESSFUL'
    AND settlement_batch_id IS NULL;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'NO_TRANSACTIONS_TO_SETTLE';
  END IF;

  SELECT settlement_ledger_account_id INTO v_settlement_account_id
  FROM public.merchant_profiles WHERE id = p_merchant_id;

  IF v_settlement_account_id IS NULL THEN
    RAISE EXCEPTION 'MERCHANT_SETTLEMENT_ACCOUNT_NOT_PROVISIONED';
  END IF;

  PERFORM 1 FROM public.ledger_accounts WHERE id = v_settlement_account_id FOR UPDATE;
  SELECT balance INTO v_settlement_balance FROM public.ledger_accounts WHERE id = v_settlement_account_id;

  IF v_net > 0 AND v_settlement_balance < v_net THEN
    RAISE EXCEPTION 'MERCHANT_SETTLEMENT_UNDERFUNDED: settlement account holds % but batch net is %', v_settlement_balance, v_net;
  END IF;

  INSERT INTO public.merchant_settlement_batches (
    merchant_id, batch_reference, gross_amount, total_fees, refunds_deducted, net_amount,
    currency, bank_name, account_number, status, transaction_count
  ) VALUES (
    p_merchant_id, 'MST-' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '-' || upper(p_currency),
    v_gross, v_fees, 0, v_net, p_currency, v_bank_name, v_account_number, 'SCHEDULED', v_count
  ) RETURNING * INTO v_batch;

  UPDATE public.merchant_payment_transactions
  SET settlement_batch_id = v_batch.id
  WHERE merchant_id = p_merchant_id
    AND currency = p_currency
    AND status = 'SUCCESSFUL'
    AND settlement_batch_id IS NULL;

  -- Settlement journal: move the net from the merchant settlement account to
  -- the payout clearing account (funds set aside for the bank rail).
  IF v_net > 0 THEN
    INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
    SELECT v_org_id, 'MERCHANT-PAYOUT-CLEARING-' || p_currency, 'Merchant Payout Clearing — ' || p_currency, 'LIABILITY', p_currency,
           (SELECT country FROM public.organizations WHERE id = v_org_id), 0.00
    WHERE NOT EXISTS (
      SELECT 1 FROM public.ledger_accounts WHERE currency = p_currency AND account_number = 'MERCHANT-PAYOUT-CLEARING-' || p_currency
    );
    SELECT id INTO v_payout_clearing_id FROM public.ledger_accounts
    WHERE currency = p_currency AND account_number = 'MERCHANT-PAYOUT-CLEARING-' || p_currency;
    PERFORM 1 FROM public.ledger_accounts WHERE id = v_payout_clearing_id FOR UPDATE;

    INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
    VALUES (v_org_id, v_batch.batch_reference, 'Merchant settlement batch — funds set aside for bank payout', v_net, p_currency, 'COMMITTED')
    RETURNING id INTO v_ledger_tx_id;

    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES
      (v_ledger_tx_id, v_settlement_account_id, 'DEBIT', v_net, p_currency, 'Merchant settlement batch: net debited from merchant settlement account'),
      (v_ledger_tx_id, v_payout_clearing_id, 'CREDIT', v_net, p_currency, 'Merchant settlement batch: staged in payout clearing awaiting bank rail');

    UPDATE public.ledger_accounts SET balance = balance - v_net, updated_at = NOW() WHERE id = v_settlement_account_id;
    UPDATE public.ledger_accounts SET balance = balance + v_net, updated_at = NOW() WHERE id = v_payout_clearing_id;

    UPDATE public.merchant_settlement_batches
    SET ledger_transaction_id = v_ledger_tx_id
    WHERE id = v_batch.id
    RETURNING * INTO v_batch;
  END IF;

  RETURN v_batch;
END;
$function$;

-- -----------------------------------------------------------------------------
-- S2.5 run_daily_settlement — v2
--   Settles EARNED (and legacy PENDING_SETTLEMENT) commissions by moving the
--   already-accrued COMMISSION-PAYABLE balance into each agent's WALLET_FLOAT
--   in one balanced multi-line journal, and marks commissions PAID. The old
--   version debited COMMISSION-EXPENSE with a SIGN BUG (balance increased on a
--   debit) and never actually paid the agents. Signature unchanged.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_daily_settlement(p_org_id uuid, p_currency character varying, p_settlement_date date DEFAULT CURRENT_DATE)
 RETURNS settlement_batches
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_batch public.settlement_batches;
  v_payable_account_id UUID;
  v_payable_balance NUMERIC(24,2);
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
  WHERE currency = p_currency AND account_number = 'COMMISSION-PAYABLE-' || p_currency;

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
    SELECT ac.agent_id, SUM(ac.amount) AS total_amount, COUNT(*) AS cnt,
           (SELECT la.id
              FROM public.agent_float_accounts afa
              JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
             WHERE afa.agent_id = ac.agent_id AND afa.account_kind = 'WALLET_FLOAT' AND afa.currency = p_currency
             LIMIT 1) AS float_account_id
    FROM public.agent_commissions ac
    JOIN public.agents a ON a.id = ac.agent_id
    WHERE a.org_id = p_org_id
      AND ac.currency = p_currency
      AND ac.status IN ('EARNED', 'PENDING_SETTLEMENT')
    GROUP BY ac.agent_id
  LOOP
    -- Agents without a wallet-float account keep their commissions in EARNED
    -- (reported by the daily close as an ageing exception) rather than
    -- crediting money to nowhere.
    IF r.float_account_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.settlement_batch_lines (settlement_batch_id, agent_id, commission_amount, commission_count)
    VALUES (v_batch.id, r.agent_id, r.total_amount, r.cnt);

    UPDATE public.agent_commissions
    SET status = 'PAID', settled_at = NOW()
    WHERE agent_id = r.agent_id AND currency = p_currency AND status IN ('EARNED', 'PENDING_SETTLEMENT');

    v_total := v_total + r.total_amount;
    v_agent_count := v_agent_count + 1;
  END LOOP;

  IF v_total > 0 THEN
    -- The payable must already be funded by earning-time accruals; settling
    -- more than was ever accrued means an accrual is missing — refuse.
    PERFORM 1 FROM public.ledger_accounts WHERE id = v_payable_account_id FOR UPDATE;
    SELECT balance INTO v_payable_balance FROM public.ledger_accounts WHERE id = v_payable_account_id;
    IF v_payable_balance < v_total THEN
      RAISE EXCEPTION 'COMMISSION_PAYABLE_UNDERFUNDED: payable holds % but settlement needs % — earning-time journalisation is missing', v_payable_balance, v_total;
    END IF;

    INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
    VALUES (p_org_id, v_batch.batch_reference, 'Daily agent commission settlement — payable settled to agent float', v_total, p_currency, 'COMMITTED')
    RETURNING id INTO v_ledger_tx_id;

    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES (v_ledger_tx_id, v_payable_account_id, 'DEBIT', v_total, p_currency, 'Commission payable settled to agent wallet float accounts');

    UPDATE public.ledger_accounts SET balance = balance - v_total, updated_at = NOW() WHERE id = v_payable_account_id;

    FOR r IN
      SELECT sbl.agent_id, sbl.commission_amount,
             (SELECT la.id
                FROM public.agent_float_accounts afa
                JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
               WHERE afa.agent_id = sbl.agent_id AND afa.account_kind = 'WALLET_FLOAT' AND afa.currency = p_currency
               LIMIT 1) AS float_account_id
      FROM public.settlement_batch_lines sbl
      WHERE sbl.settlement_batch_id = v_batch.id
      FOR UPDATE OF sbl
    LOOP
      PERFORM 1 FROM public.ledger_accounts WHERE id = r.float_account_id FOR UPDATE;

      INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
      VALUES (v_ledger_tx_id, r.float_account_id, 'CREDIT', r.commission_amount, p_currency, 'Commission settled to agent wallet float');

      UPDATE public.ledger_accounts SET balance = balance + r.commission_amount, updated_at = NOW() WHERE id = r.float_account_id;

      UPDATE public.settlement_batch_lines
      SET ledger_transaction_id = v_ledger_tx_id, status = 'PAID'
      WHERE settlement_batch_id = v_batch.id AND agent_id = r.agent_id;
    END LOOP;
  END IF;

  UPDATE public.settlement_batches
  SET status = 'POSTED', total_commission_amount = v_total, total_agent_count = v_agent_count, posted_at = NOW()
  WHERE id = v_batch.id
  RETURNING * INTO v_batch;

  RETURN v_batch;
END;
$function$;

-- -----------------------------------------------------------------------------
-- S2.6 approve_agent_float_topup — v2 (SIGN FIX)
--   The treasury leg is a DEBIT ("treasury funds agent float"), so under the
--   credit-positive convention the treasury balance must DECREASE. The old
--   version increased it (equity minted on every top-up). Signature unchanged.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_agent_float_topup(p_request_id uuid, p_reviewer_id uuid)
 RETURNS agent_float_topup_requests
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_request public.agent_float_topup_requests;
  v_org_id UUID;
  v_wallet_float_id UUID;
  v_treasury_account_id UUID;
  v_ledger_tx_id UUID;
BEGIN
  SELECT * INTO v_request FROM public.agent_float_topup_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOPUP_REQUEST_NOT_FOUND';
  END IF;
  IF v_request.status <> 'PENDING' THEN
    RAISE EXCEPTION 'TOPUP_REQUEST_ALREADY_DECIDED';
  END IF;

  SELECT org_id INTO v_org_id FROM public.agents WHERE id = v_request.agent_id;

  SELECT la.id INTO v_wallet_float_id
  FROM public.agent_float_accounts afa
  JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
  WHERE afa.agent_id = v_request.agent_id AND afa.account_kind = 'WALLET_FLOAT' AND afa.currency = v_request.currency
  FOR UPDATE OF la;

  IF v_wallet_float_id IS NULL THEN
    RAISE EXCEPTION 'AGENT_FLOAT_NOT_PROVISIONED';
  END IF;

  SELECT id INTO v_treasury_account_id FROM public.ledger_accounts
  WHERE org_id = v_org_id AND currency = v_request.currency AND account_number = 'TREASURY-' || (SELECT country FROM public.organizations WHERE id = v_org_id) || '-AGENT-FUNDING';

  IF v_treasury_account_id IS NULL THEN
    INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
    VALUES (
      v_org_id,
      'TREASURY-' || (SELECT country FROM public.organizations WHERE id = v_org_id) || '-AGENT-FUNDING',
      'Treasury — Agent Float Funding',
      'EQUITY', v_request.currency, (SELECT country FROM public.organizations WHERE id = v_org_id), 0
    )
    RETURNING id INTO v_treasury_account_id;
  END IF;

  PERFORM 1 FROM public.ledger_accounts WHERE id = v_treasury_account_id FOR UPDATE;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_org_id, 'FTU-' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '-' || UPPER(SUBSTRING(p_request_id::text, 1, 6)), 'Agent float top-up approved', v_request.amount, v_request.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_treasury_account_id, 'DEBIT', v_request.amount, v_request.currency, 'Treasury funds agent float top-up'),
    (v_ledger_tx_id, v_wallet_float_id, 'CREDIT', v_request.amount, v_request.currency, 'Agent wallet float credited from approved top-up');

  -- SIGN FIX: treasury is DEBITED, so its balance decreases (equity drawn down).
  UPDATE public.ledger_accounts SET balance = balance - v_request.amount, updated_at = NOW() WHERE id = v_treasury_account_id;
  UPDATE public.ledger_accounts SET balance = balance + v_request.amount, updated_at = NOW() WHERE id = v_wallet_float_id;

  UPDATE public.agent_float_topup_requests
  SET status = 'APPROVED', reviewed_by = p_reviewer_id, reviewed_at = NOW(), ledger_transaction_id = v_ledger_tx_id
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  RETURN v_request;
END;
$function$;

-- -----------------------------------------------------------------------------
-- S2.7 post_adashi_contribution_agent_collect — v2 (SIGN FIX)
--   The agent cash-in-hand leg is a DEBIT (the cash the agent collected is
--   owed to the group escrow, so the agent's net position DECREASES), while
--   the escrow liability is CREDITED (increases). The old version increased
--   the agent balance on a debit — creating value out of nothing.
--   Signature unchanged.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_adashi_contribution_agent_collect(p_obligation_id uuid, p_agent_id uuid, p_idempotency_key character varying, p_payment_reference character varying)
 RETURNS adashi.contribution_obligations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'adashi', 'liquidity', 'extensions'
AS $function$
DECLARE
  v_obligation adashi.contribution_obligations;
  v_group adashi.groups;
  v_cash_hand_id UUID;
  v_cash_hand_balance NUMERIC(24,2);
  v_escrow_account_id UUID;
  v_org_id UUID;
  v_ledger_tx_id UUID;
  v_existing_key RECORD;
BEGIN
  SELECT * INTO v_existing_key FROM adashi.idempotency_keys
  WHERE idempotency_key = p_idempotency_key AND scope = 'CONTRIBUTION_DEBIT_AGENT_CASH';
  IF FOUND THEN
    IF v_existing_key.status = 'COMMITTED' THEN
      RETURN (SELECT o FROM adashi.contribution_obligations o WHERE o.id = p_obligation_id);
    ELSIF v_existing_key.status = 'IN_FLIGHT' THEN
      RAISE EXCEPTION 'CONTRIBUTION_ALREADY_IN_FLIGHT';
    END IF;
  END IF;

  SELECT * INTO v_obligation FROM adashi.contribution_obligations WHERE id = p_obligation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'OBLIGATION_NOT_FOUND';
  END IF;
  IF v_obligation.status = 'PAID' THEN
    RETURN v_obligation;
  END IF;
  IF v_obligation.status NOT IN ('SCHEDULED', 'DUE', 'OVERDUE') THEN
    RAISE EXCEPTION 'OBLIGATION_NOT_PAYABLE_IN_STATUS_%', v_obligation.status;
  END IF;

  SELECT * INTO v_group FROM adashi.groups WHERE id = v_obligation.group_id FOR UPDATE;

  -- The collecting agent must actually be assigned to this group.
  IF v_group.assigned_agent_id IS DISTINCT FROM p_agent_id THEN
    RAISE EXCEPTION 'AGENT_NOT_ASSIGNED_TO_GROUP';
  END IF;

  SELECT la.id, la.org_id, la.balance INTO v_cash_hand_id, v_org_id, v_cash_hand_balance
  FROM public.agent_float_accounts afa
  JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
  WHERE afa.agent_id = p_agent_id AND afa.account_kind = 'CASH_IN_HAND' AND afa.currency = v_obligation.currency
  FOR UPDATE OF la;

  IF v_cash_hand_id IS NULL THEN
    RAISE EXCEPTION 'AGENT_FLOAT_NOT_PROVISIONED';
  END IF;

  SELECT id INTO v_escrow_account_id FROM public.ledger_accounts
  WHERE account_number = v_group.escrow_vault_account_id;
  IF v_escrow_account_id IS NULL THEN
    RAISE EXCEPTION 'ESCROW_ACCOUNT_NOT_CONFIGURED';
  END IF;
  PERFORM 1 FROM public.ledger_accounts WHERE id = v_escrow_account_id FOR UPDATE;

  INSERT INTO adashi.idempotency_keys (idempotency_key, scope, resource_id, request_hash, status, expires_at)
  VALUES (p_idempotency_key, 'CONTRIBUTION_DEBIT_AGENT_CASH', p_obligation_id::text, encode(digest(p_obligation_id::text || p_agent_id::text, 'sha256'), 'hex'), 'IN_FLIGHT', NOW() + INTERVAL '7 days')
  ON CONFLICT (idempotency_key) DO NOTHING;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_org_id, p_payment_reference, 'Adashi contribution (agent cash collected): ' || v_group.name || ' cycle ' || v_obligation.cycle_number, v_obligation.amount, v_obligation.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  -- The agent collected the customer's cash, but that cash belongs to the
  -- group escrow: the agent's net position DECREASES (DEBIT) while the
  -- group's escrow liability INCREASES (CREDIT).
  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_cash_hand_id, 'DEBIT', v_obligation.amount, v_obligation.currency, 'Adashi contribution collected as physical cash by agent (owed to group escrow)'),
    (v_ledger_tx_id, v_escrow_account_id, 'CREDIT', v_obligation.amount, v_obligation.currency, 'Adashi contribution (agent-collected cash) received into group escrow');

  -- SIGN FIX: agent cash-in-hand is DEBITED, so its balance decreases.
  UPDATE public.ledger_accounts SET balance = balance - v_obligation.amount, updated_at = NOW() WHERE id = v_cash_hand_id;
  UPDATE public.ledger_accounts SET balance = balance + v_obligation.amount, updated_at = NOW() WHERE id = v_escrow_account_id;

  UPDATE adashi.contribution_obligations
  SET status = 'PAID', paid_at = NOW(), ledger_journal_id = v_ledger_tx_id::text,
      payment_reference = p_payment_reference, updated_at = NOW()
  WHERE id = p_obligation_id
  RETURNING * INTO v_obligation;

  UPDATE adashi.members
  SET total_contributed = total_contributed + v_obligation.amount, updated_at = NOW()
  WHERE group_id = v_obligation.group_id AND customer_id = v_obligation.customer_id;

  UPDATE adashi.cycles
  SET collected_pool = collected_pool + v_obligation.amount,
      outstanding_amount = GREATEST(outstanding_amount - v_obligation.amount, 0),
      status = CASE
        WHEN (collected_pool + v_obligation.amount) >= expected_pool THEN 'COLLECTION_COMPLETED'
        ELSE 'COLLECTION_IN_PROGRESS'
      END,
      updated_at = NOW()
  WHERE id = v_obligation.cycle_id;

  INSERT INTO adashi.contribution_events (obligation_id, event_type, previous_status, new_status, actor_id, actor_role, details_json)
  VALUES (p_obligation_id, 'CONTRIBUTION_PAID_AGENT_CASH', 'SCHEDULED', 'PAID', p_agent_id, 'AGENT',
          jsonb_build_object('amount', v_obligation.amount, 'currency', v_obligation.currency, 'ledger_transaction_id', v_ledger_tx_id));

  INSERT INTO adashi.notifications (group_id, customer_id, notification_type, channel, recipient, content_preview, delivery_status)
  SELECT v_group.id, v_obligation.customer_id, 'CONTRIBUTION_CONFIRMED', 'IN_APP', c.phone,
         'Your ' || v_obligation.currency || ' ' || v_obligation.amount::text || ' contribution to ' || v_group.name || ' (cycle ' || v_obligation.cycle_number || ') was collected by your agent and confirmed.', 'SENT'
  FROM public.customers c WHERE c.id = v_obligation.customer_id;

  UPDATE adashi.idempotency_keys SET status = 'COMMITTED' WHERE idempotency_key = p_idempotency_key;

  RETURN v_obligation;
EXCEPTION WHEN OTHERS THEN
  UPDATE adashi.idempotency_keys SET status = 'FAILED' WHERE idempotency_key = p_idempotency_key AND status = 'IN_FLIGHT';
  RAISE;
END;
$function$;

-- -----------------------------------------------------------------------------
-- S2.8 _execute_adashi_payout_disbursement — v2 (ESCROW FLOOR)
--   Refuses to disburse more than the group escrow actually holds. This is the
--   control that would have prevented the NGN 60,000 over-payout (case G3).
--   Signature unchanged.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._execute_adashi_payout_disbursement(p_payout_id uuid, p_actor_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'adashi', 'liquidity', 'extensions'
AS $function$
DECLARE
  v_payout adashi.payouts;
  v_group adashi.groups;
  v_escrow_account_id UUID;
  v_escrow_balance NUMERIC(24,2);
  v_fee_revenue_id UUID;
  v_commission_payable_id UUID;
  v_beneficiary_wallet public.wallets;
  v_ledger_tx_id UUID;
  v_org_id UUID;
BEGIN
  SELECT * INTO v_payout FROM adashi.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYOUT_NOT_FOUND';
  END IF;
  IF v_payout.status IN ('SUCCESS', 'PROCESSING') THEN
    RETURN; -- already executed / in flight, no-op
  END IF;
  IF v_payout.status NOT IN ('AUTHORIZED') THEN
    RAISE EXCEPTION 'PAYOUT_NOT_AUTHORIZED_STATUS_%', v_payout.status;
  END IF;

  SELECT * INTO v_group FROM adashi.groups WHERE id = v_payout.group_id;

  SELECT id, org_id INTO v_escrow_account_id, v_org_id FROM public.ledger_accounts
  WHERE account_number = v_group.escrow_vault_account_id;
  IF v_escrow_account_id IS NULL THEN
    RAISE EXCEPTION 'ESCROW_ACCOUNT_NOT_CONFIGURED';
  END IF;

  SELECT id INTO v_fee_revenue_id FROM public.ledger_accounts
  WHERE currency = v_payout.currency AND account_number LIKE 'ADASHI-FEE-REVENUE-%';
  SELECT id INTO v_commission_payable_id FROM public.ledger_accounts
  WHERE currency = v_payout.currency AND account_number LIKE 'ADASHI-AGENT-COMMISSION-%';

  SELECT * INTO v_beneficiary_wallet FROM public.wallets
  WHERE customer_id = v_payout.beneficiary_customer_id AND currency = v_payout.currency FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BENEFICIARY_WALLET_NOT_FOUND';
  END IF;
  IF v_beneficiary_wallet.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'BENEFICIARY_WALLET_NOT_ACTIVE';
  END IF;

  -- Lock the escrow (and fee/payable accounts) and CHECK SUFFICIENCY: the
  -- escrow must actually hold the gross amount being disbursed.
  SELECT balance INTO v_escrow_balance FROM public.ledger_accounts
  WHERE id = v_escrow_account_id FOR UPDATE;
  PERFORM 1 FROM public.ledger_accounts
  WHERE id IN (v_fee_revenue_id, v_commission_payable_id) FOR UPDATE;

  IF v_escrow_balance < v_payout.gross_amount THEN
    RAISE EXCEPTION 'ADASHI_ESCROW_INSUFFICIENT_FUNDS: group % escrow % holds % %, payout requires % %',
      v_group.name, v_group.escrow_vault_account_id, v_escrow_balance, v_payout.currency, v_payout.gross_amount, v_payout.currency;
  END IF;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_org_id, v_payout.payment_reference, 'Adashi payout: ' || v_group.name || ' cycle ' || v_payout.cycle_number, v_payout.gross_amount, v_payout.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES (v_ledger_tx_id, v_escrow_account_id, 'DEBIT', v_payout.gross_amount, v_payout.currency, 'Adashi payout: gross pool released from group escrow');

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES (v_ledger_tx_id, v_beneficiary_wallet.ledger_account_id, 'CREDIT', v_payout.net_disbursed_amount, v_payout.currency, 'Adashi payout: net amount credited to beneficiary wallet');

  IF v_payout.platform_fee > 0 AND v_fee_revenue_id IS NOT NULL THEN
    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES (v_ledger_tx_id, v_fee_revenue_id, 'CREDIT', v_payout.platform_fee, v_payout.currency, 'Adashi payout: platform fee recognised as revenue');
  END IF;

  IF v_payout.agent_commission > 0 AND v_commission_payable_id IS NOT NULL THEN
    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES (v_ledger_tx_id, v_commission_payable_id, 'CREDIT', v_payout.agent_commission, v_payout.currency, 'Adashi payout: agent commission accrued payable');
  END IF;

  UPDATE public.ledger_accounts SET balance = balance - v_payout.gross_amount, updated_at = NOW() WHERE id = v_escrow_account_id;
  UPDATE public.ledger_accounts SET balance = balance + v_payout.net_disbursed_amount, updated_at = NOW() WHERE id = v_beneficiary_wallet.ledger_account_id;
  IF v_payout.platform_fee > 0 AND v_fee_revenue_id IS NOT NULL THEN
    UPDATE public.ledger_accounts SET balance = balance + v_payout.platform_fee, updated_at = NOW() WHERE id = v_fee_revenue_id;
  END IF;
  IF v_payout.agent_commission > 0 AND v_commission_payable_id IS NOT NULL THEN
    UPDATE public.ledger_accounts SET balance = balance + v_payout.agent_commission, updated_at = NOW() WHERE id = v_commission_payable_id;
  END IF;

  UPDATE public.wallets SET balance = balance + v_payout.net_disbursed_amount, updated_at = NOW() WHERE id = v_beneficiary_wallet.id;

  UPDATE adashi.payouts
  SET status = 'SUCCESS', ledger_journal_id = v_ledger_tx_id::text, disbursed_at = NOW(), updated_at = NOW()
  WHERE id = p_payout_id;

  UPDATE adashi.members
  SET total_payout_received = total_payout_received + v_payout.net_disbursed_amount, updated_at = NOW()
  WHERE group_id = v_payout.group_id AND customer_id = v_payout.beneficiary_customer_id;

  UPDATE adashi.cycles
  SET status = 'PAYOUT_COMPLETED', payout_reference = v_payout.payment_reference, payout_completed_at = NOW(), updated_at = NOW()
  WHERE id = v_payout.cycle_id;

  -- NEW: advance the rotation — open the next cycle for contributions, or
  -- mark the group COMPLETED if this was the last cycle. Same transaction
  -- as everything else above, so a failure here rolls back the whole
  -- disbursement rather than leaving the group silently stuck.
  PERFORM adashi.advance_adashi_cycle(v_payout.group_id, v_payout.cycle_number);

  INSERT INTO adashi.payout_events (payout_id, event_type, previous_status, new_status, actor_id, details_json)
  VALUES (p_payout_id, 'PAYOUT_DISBURSED', 'AUTHORIZED', 'SUCCESS', p_actor_id,
          jsonb_build_object('net_disbursed_amount', v_payout.net_disbursed_amount, 'ledger_transaction_id', v_ledger_tx_id));

  INSERT INTO adashi.notifications (group_id, customer_id, notification_type, channel, recipient, content_preview, delivery_status)
  SELECT v_group.id, v_payout.beneficiary_customer_id, 'PAYOUT_DISBURSED', 'IN_APP', c.phone,
         'Congratulations! Your ' || v_payout.currency || ' ' || v_payout.net_disbursed_amount::text || ' payout for ' || v_group.name || ' (cycle ' || v_payout.cycle_number || ') has been credited to your wallet.', 'SENT'
  FROM public.customers c WHERE c.id = v_payout.beneficiary_customer_id;
END;
$function$;

-- =============================================================================
-- S3. Integrity trigger functions (attached in S11)
-- =============================================================================

-- Fires deferred on ledger_accounts AFTER UPDATE OF balance: the stored
-- balance must equal the journal-derived balance (SUM credits - SUM debits).
CREATE OR REPLACE FUNCTION public.verify_account_balance_integrity() RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_derived NUMERIC(24,2);
BEGIN
  SELECT COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END), 0)
  INTO v_derived
  FROM public.ledger_entries
  WHERE account_id = NEW.id;

  IF NEW.balance <> v_derived THEN
    RAISE EXCEPTION 'LEDGER_BALANCE_DRIFT: account % stored balance % does not match journal-derived balance % — balances may only move via journal entries',
      NEW.account_number, NEW.balance, v_derived;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fires deferred on ledger_entries AFTER INSERT: the account touched by the
-- new entry must (at commit) satisfy stored = derived. Catches inserts of
-- entries that are never accompanied by a matching balance update.
CREATE OR REPLACE FUNCTION public.verify_entry_account_balance() RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_stored NUMERIC(24,2);
  v_derived NUMERIC(24,2);
BEGIN
  SELECT a.balance,
         COALESCE((SELECT SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END)
                   FROM public.ledger_entries e WHERE e.account_id = a.id), 0)
  INTO v_stored, v_derived
  FROM public.ledger_accounts a
  WHERE a.id = NEW.account_id;

  IF v_stored IS DISTINCT FROM v_derived THEN
    RAISE EXCEPTION 'LEDGER_BALANCE_DRIFT: account touched by entry % has stored balance % vs journal-derived % — balances may only move via journal entries',
      NEW.id, v_stored, v_derived;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fires deferred on wallets AFTER UPDATE OF balance: the wallet must agree
-- with its linked ledger account.
CREATE OR REPLACE FUNCTION public.verify_wallet_ledger_sync() RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_ledger NUMERIC(24,2);
BEGIN
  IF NEW.ledger_account_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT balance INTO v_ledger FROM public.ledger_accounts WHERE id = NEW.ledger_account_id;
  IF NEW.balance <> v_ledger THEN
    RAISE EXCEPTION 'WALLET_LEDGER_DESYNC: wallet % shows % but its ledger account shows % — wallet balances may only move via journal entries',
      NEW.id, NEW.balance, v_ledger;
  END IF;
  RETURN NULL;
END;
$function$;

-- Immediate BEFORE INSERT guards: accounts and wallets must open at zero.
-- Funding happens through journal entries, never through opening balances
-- (this kills the XOF-597 class of out-of-band provisioning).
CREATE OR REPLACE FUNCTION public.enforce_zero_opening_balance() RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.balance <> 0 THEN
    RAISE EXCEPTION 'OPENING_BALANCE_MUST_BE_ZERO: % opened with % — fund accounts via journal entries, not opening balances',
      NEW.account_number, NEW.balance;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_wallet_zero_opening() RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.balance <> 0 THEN
    RAISE EXCEPTION 'WALLET_OPENING_BALANCE_MUST_BE_ZERO: wallet % opened with % — fund wallets via journal entries',
      NEW.id, NEW.balance;
  END IF;
  RETURN NEW;
END;
$function$;

-- =============================================================================
-- S4. FX rate governance: history + actor requirement + reciprocity
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.fx_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_currency CHARACTER VARYING NOT NULL,
  destination_currency CHARACTER VARYING NOT NULL,
  old_rate NUMERIC NOT NULL,
  new_rate NUMERIC NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.enforce_fx_rate_governance() RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_reverse NUMERIC;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Every rate change must be attributed to an actor.
    IF NEW.updated_by IS NULL AND OLD.updated_by IS NULL THEN
      RAISE EXCEPTION 'FX_RATE_UPDATE_REQUIRES_ACTOR: set updated_by when changing rates';
    END IF;
    IF NEW.rate IS DISTINCT FROM OLD.rate THEN
      INSERT INTO public.fx_rate_history (source_currency, destination_currency, old_rate, new_rate, changed_by)
      VALUES (OLD.source_currency, OLD.destination_currency, OLD.rate, NEW.rate, NEW.updated_by);
    END IF;
  END IF;

  -- Reciprocity: NGN->XOF times XOF->NGN must be within 1% of parity.
  SELECT rate INTO v_reverse
  FROM public.fx_rates
  WHERE source_currency = NEW.destination_currency
    AND destination_currency = NEW.source_currency
    AND id <> NEW.id;
  IF v_reverse IS NOT NULL AND abs(NEW.rate * v_reverse - 1) > 0.01 THEN
    RAISE EXCEPTION 'FX_RATE_PAIR_NOT_RECIPROCAL: %->% rate % x reverse % = % (must be within 1%% of 1)',
      NEW.source_currency, NEW.destination_currency, NEW.rate, v_reverse, NEW.rate * v_reverse;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_fx_rate_governance ON public.fx_rates;
CREATE TRIGGER trg_fx_rate_governance
  BEFORE INSERT OR UPDATE ON public.fx_rates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_fx_rate_governance();

-- =============================================================================
-- S5. Merchant cancellation guard: a transaction that has been swept into a
--     settlement batch can no longer be silently cancelled — it must go
--     through an explicit refund flow.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.guard_merchant_txn_cancellation() RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.status = 'SUCCESSFUL' AND NEW.status <> 'SUCCESSFUL' AND OLD.settlement_batch_id IS NOT NULL THEN
    RAISE EXCEPTION 'CANNOT_CANCEL_SETTLED_TRANSACTION: transaction % is in settlement batch % — use the refund flow',
      OLD.id, OLD.settlement_batch_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_merchant_cancel ON public.merchant_payment_transactions;
CREATE TRIGGER trg_guard_merchant_cancel
  BEFORE UPDATE ON public.merchant_payment_transactions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.guard_merchant_txn_cancellation();

-- =============================================================================
-- S6. Sanctioned, audited journal paths: adjustments and funding
-- =============================================================================

-- post_adjustment_journal: the ONLY sanctioned way to post an out-of-band
-- correction. Balanced multi-line, reason and actor mandatory, audit event.
CREATE OR REPLACE FUNCTION public.post_adjustment_journal(
  p_org_id uuid,
  p_currency character varying,
  p_reference character varying,
  p_reason text,
  p_posted_by character varying,
  p_lines jsonb)
RETURNS public.ledger_transactions
LANGUAGE plpgsql
AS $function$
DECLARE
  v_existing public.ledger_transactions;
  v_tx public.ledger_transactions;
  v_debits NUMERIC(24,2) := 0;
  v_credits NUMERIC(24,2) := 0;
  v_line jsonb;
  v_account public.ledger_accounts;
  v_ledger_tx_id UUID;
  i INT;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) < 20 THEN
    RAISE EXCEPTION 'ADJUSTMENT_REASON_REQUIRED: provide a meaningful reason (min 20 chars)';
  END IF;
  IF p_posted_by IS NULL OR length(trim(p_posted_by)) = 0 THEN
    RAISE EXCEPTION 'ADJUSTMENT_ACTOR_REQUIRED';
  END IF;
  IF p_lines IS NULL OR jsonb_array_length(p_lines) < 2 THEN
    RAISE EXCEPTION 'ADJUSTMENT_NEEDS_AT_LEAST_2_LINES';
  END IF;

  SELECT * INTO v_existing FROM public.ledger_transactions WHERE transaction_reference = p_reference;
  IF FOUND THEN
    RETURN v_existing; -- idempotent by reference
  END IF;

  -- Validate every line and check the journal balances BEFORE touching money.
  FOR i IN 0 .. jsonb_array_length(p_lines) - 1 LOOP
    v_line := p_lines -> i;
    IF v_line ->> 'entry_type' NOT IN ('DEBIT', 'CREDIT') THEN
      RAISE EXCEPTION 'INVALID_ENTRY_TYPE_%', v_line ->> 'entry_type';
    END IF;
    IF COALESCE((v_line ->> 'amount')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION 'ADJUSTMENT_AMOUNT_MUST_BE_POSITIVE';
    END IF;
    SELECT * INTO v_account FROM public.ledger_accounts
    WHERE account_number = v_line ->> 'account_number' AND currency = p_currency;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ACCOUNT_NOT_FOUND_%', v_line ->> 'account_number';
    END IF;
    IF v_line ->> 'entry_type' = 'DEBIT' THEN
      v_debits := v_debits + (v_line ->> 'amount')::numeric;
    ELSE
      v_credits := v_credits + (v_line ->> 'amount')::numeric;
    END IF;
  END LOOP;

  IF v_debits <> v_credits THEN
    RAISE EXCEPTION 'ADJUSTMENT_NOT_BALANCED: debits % vs credits %', v_debits, v_credits;
  END IF;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (p_org_id, p_reference, 'Adjustment journal: ' || p_reason, v_debits, p_currency, 'COMMITTED')
  RETURNING * INTO v_tx;
  v_ledger_tx_id := v_tx.id;

  FOR i IN 0 .. jsonb_array_length(p_lines) - 1 LOOP
    v_line := p_lines -> i;
    SELECT * INTO v_account FROM public.ledger_accounts
    WHERE account_number = v_line ->> 'account_number' AND currency = p_currency
    FOR UPDATE;
    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES (v_ledger_tx_id, v_account.id, v_line ->> 'entry_type', (v_line ->> 'amount')::numeric, p_currency,
            COALESCE(v_line ->> 'narration', 'Adjustment: ' || p_reason));
    UPDATE public.ledger_accounts
    SET balance = balance + CASE WHEN v_line ->> 'entry_type' = 'CREDIT' THEN (v_line ->> 'amount')::numeric ELSE -(v_line ->> 'amount')::numeric END,
        updated_at = NOW()
    WHERE id = v_account.id;
  END LOOP;

  INSERT INTO public.audit_events (org_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (
    p_org_id,
    '00000000-0000-4000-8000-000000000001',
    'system@koriepay.internal',
    'SYSTEM',
    'ADJUSTMENT_JOURNAL_POSTED',
    'ledger_transactions',
    v_ledger_tx_id::text,
    jsonb_build_object('reference', p_reference, 'reason', p_reason, 'posted_by', p_posted_by, 'lines', p_lines),
    'db-migration',
    'ADJ-' || p_reference,
    'ADJ-' || p_reference
  );

  RETURN v_tx;
END;
$function$;

-- post_funding_journal: the sanctioned replacement for out-of-band treasury
-- funding (RISK-30). Two-line funding journal, purpose and actor mandatory,
-- audit event. The reference must start with FUND-.
CREATE OR REPLACE FUNCTION public.post_funding_journal(
  p_org_id uuid,
  p_currency character varying,
  p_reference character varying,
  p_purpose text,
  p_posted_by character varying,
  p_debit_account_number character varying,
  p_credit_account_number character varying,
  p_amount numeric)
RETURNS public.ledger_transactions
LANGUAGE plpgsql
AS $function$
DECLARE
  v_existing public.ledger_transactions;
  v_tx public.ledger_transactions;
  v_debit public.ledger_accounts;
  v_credit public.ledger_accounts;
BEGIN
  IF p_reference IS NULL OR p_reference NOT LIKE 'FUND-%' THEN
    RAISE EXCEPTION 'FUNDING_REFERENCE_MUST_START_WITH_FUND_';
  END IF;
  IF p_purpose IS NULL OR length(trim(p_purpose)) < 10 THEN
    RAISE EXCEPTION 'FUNDING_PURPOSE_REQUIRED';
  END IF;
  IF p_posted_by IS NULL OR length(trim(p_posted_by)) = 0 THEN
    RAISE EXCEPTION 'FUNDING_ACTOR_REQUIRED';
  END IF;
  IF COALESCE(p_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'FUNDING_AMOUNT_MUST_BE_POSITIVE';
  END IF;

  SELECT * INTO v_existing FROM public.ledger_transactions WHERE transaction_reference = p_reference;
  IF FOUND THEN
    RETURN v_existing; -- idempotent by reference
  END IF;

  SELECT * INTO v_debit FROM public.ledger_accounts
  WHERE account_number = p_debit_account_number AND currency = p_currency FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DEBIT_ACCOUNT_NOT_FOUND_%', p_debit_account_number;
  END IF;
  SELECT * INTO v_credit FROM public.ledger_accounts
  WHERE account_number = p_credit_account_number AND currency = p_currency FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CREDIT_ACCOUNT_NOT_FOUND_%', p_credit_account_number;
  END IF;
  IF v_debit.id = v_credit.id THEN
    RAISE EXCEPTION 'FUNDING_CANNOT_TARGET_THE_SAME_ACCOUNT';
  END IF;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (p_org_id, p_reference, 'Treasury funding journal: ' || p_purpose, p_amount, p_currency, 'COMMITTED')
  RETURNING * INTO v_tx;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_tx.id, v_debit.id, 'DEBIT', p_amount, p_currency, 'Funding source: ' || p_purpose),
    (v_tx.id, v_credit.id, 'CREDIT', p_amount, p_currency, 'Funding destination: ' || p_purpose);

  UPDATE public.ledger_accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_debit.id;
  UPDATE public.ledger_accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = v_credit.id;

  INSERT INTO public.audit_events (org_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (
    p_org_id,
    '00000000-0000-4000-8000-000000000001',
    'system@koriepay.internal',
    'SYSTEM',
    'FUNDING_JOURNAL_POSTED',
    'ledger_transactions',
    v_tx.id::text,
    jsonb_build_object('reference', p_reference, 'purpose', p_purpose, 'posted_by', p_posted_by,
                       'debit_account', p_debit_account_number, 'credit_account', p_credit_account_number, 'amount', p_amount),
    'db-migration',
    'FUND-' || p_reference,
    'FUND-' || p_reference
  );

  RETURN v_tx;
END;
$function$;

-- recognize_transfer_fee_revenue: called when a provider confirms a transfer
-- (status SUCCESSFUL). Moves the fee from TRANSFER-FEE-DEFERRED to
-- TRANSFER-FEE-REVENUE. Idempotent by journal reference.
CREATE OR REPLACE FUNCTION public.recognize_transfer_fee_revenue(p_customer_transaction_id uuid)
RETURNS public.ledger_transactions
LANGUAGE plpgsql
AS $function$
DECLARE
  v_ct public.customer_transactions;
  v_existing public.ledger_transactions;
  v_tx public.ledger_transactions;
  v_deferred public.ledger_accounts;
  v_revenue_id UUID;
  v_ledger_tx_id UUID;
BEGIN
  SELECT * INTO v_ct FROM public.customer_transactions WHERE id = p_customer_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSACTION_NOT_FOUND';
  END IF;
  IF v_ct.status <> 'SUCCESSFUL' THEN
    RAISE EXCEPTION 'FEE_NOT_RECOGNISABLE_STATUS_%_fee_is_recognised_only_on_executed_transfers', v_ct.status;
  END IF;
  IF COALESCE(v_ct.fee, 0) <= 0 THEN
    RAISE EXCEPTION 'NO_FEE_TO_RECOGNISE';
  END IF;

  SELECT * INTO v_existing FROM public.ledger_transactions WHERE transaction_reference = 'FEE-REC-' || v_ct.reference;
  IF FOUND THEN
    RETURN v_existing; -- already recognised
  END IF;

  SELECT * INTO v_deferred FROM public.ledger_accounts
  WHERE account_number = 'TRANSFER-FEE-DEFERRED-' || v_ct.currency AND currency = v_ct.currency
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSFER_FEE_DEFERRED_ACCOUNT_NOT_FOUND_%', 'TRANSFER-FEE-DEFERRED-' || v_ct.currency;
  END IF;

  INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
  SELECT v_deferred.org_id, 'TRANSFER-FEE-REVENUE-' || v_ct.currency, 'Customer Transfer Fee Revenue — ' || v_ct.currency, 'REVENUE', v_ct.currency,
         (SELECT country FROM public.organizations WHERE id = v_deferred.org_id), 0.00
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ledger_accounts WHERE currency = v_ct.currency AND account_number = 'TRANSFER-FEE-REVENUE-' || v_ct.currency
  );
  SELECT id INTO v_revenue_id FROM public.ledger_accounts
  WHERE currency = v_ct.currency AND account_number = 'TRANSFER-FEE-REVENUE-' || v_ct.currency;
  PERFORM 1 FROM public.ledger_accounts WHERE id = v_revenue_id FOR UPDATE;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_deferred.org_id, 'FEE-REC-' || v_ct.reference, 'Transfer fee revenue recognition on executed transfer', v_ct.fee, v_ct.currency, 'COMMITTED')
  RETURNING * INTO v_tx;
  v_ledger_tx_id := v_tx.id;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_deferred.id, 'DEBIT', v_ct.fee, v_ct.currency, 'Transfer fee earned on execution: deferred balance released'),
    (v_ledger_tx_id, v_revenue_id, 'CREDIT', v_ct.fee, v_ct.currency, 'Transfer fee revenue recognised');

  UPDATE public.ledger_accounts SET balance = balance - v_ct.fee, updated_at = NOW() WHERE id = v_deferred.id;
  UPDATE public.ledger_accounts SET balance = balance + v_ct.fee, updated_at = NOW() WHERE id = v_revenue_id;

  RETURN v_tx;
END;
$function$;

-- =============================================================================
-- S7. recalculate_all_balances: restate stored balances from the journal
-- =============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_all_balances()
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_accounts INT := 0;
  v_zeroed INT := 0;
  v_wallets INT := 0;
BEGIN
  WITH derived AS (
    SELECT account_id, SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END) AS derived_balance
    FROM public.ledger_entries
    GROUP BY account_id
  ),
  restated AS (
    UPDATE public.ledger_accounts la
    SET balance = derived.derived_balance, updated_at = NOW()
    FROM derived
    WHERE derived.account_id = la.id AND la.balance <> derived.derived_balance
    RETURNING la.id
  )
  SELECT count(*) INTO v_accounts FROM restated;

  WITH zeroed AS (
    UPDATE public.ledger_accounts la
    SET balance = 0, updated_at = NOW()
    WHERE la.balance <> 0
      AND NOT EXISTS (SELECT 1 FROM public.ledger_entries e WHERE e.account_id = la.id)
    RETURNING la.id
  )
  SELECT count(*) INTO v_zeroed FROM zeroed;

  WITH resynced AS (
    UPDATE public.wallets w
    SET balance = la.balance, updated_at = NOW()
    FROM public.ledger_accounts la
    WHERE la.id = w.ledger_account_id AND w.balance <> la.balance
    RETURNING w.id
  )
  SELECT count(*) INTO v_wallets FROM resynced;

  INSERT INTO public.audit_events (org_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (
    NULL,
    '00000000-0000-4000-8000-000000000001',
    'system@koriepay.internal',
    'SYSTEM',
    'LEDGER_BALANCES_RECALCULATED',
    'ledger_accounts',
    'ALL',
    jsonb_build_object('accounts_restatemented', v_accounts, 'accounts_zeroed', v_zeroed, 'wallets_resynced', v_wallets),
    'db-migration',
    'RECALC-20260914',
    'RECALC-20260914'
  );

  RETURN jsonb_build_object('accounts_restatemented', v_accounts, 'accounts_zeroed', v_zeroed, 'wallets_resynced', v_wallets);
END;
$function$;

-- =============================================================================
-- S8. Provision repair / suspense accounts (zero-opening, ON CONFLICT safe)
-- =============================================================================

DO $do$
DECLARE
  v_agent_org UUID;
  v_adashi_org UUID;
BEGIN
  SELECT org_id INTO v_agent_org FROM public.ledger_accounts WHERE account_number = 'AGT-CASH-NG-0042' LIMIT 1;
  SELECT org_id INTO v_adashi_org FROM public.ledger_accounts WHERE account_number = 'ADASHI-ESCROW-NGN' LIMIT 1;

  INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
  VALUES
    (v_agent_org,  'AGENCY-FEE-REVENUE-NGN',   'Agency Customer Fee Revenue — NGN',            'REVENUE',   'NGN', 'NG', 0.00),
    (v_agent_org,  'COMMISSION-EXPENSE-NGN',   'Agent Commission Expense — NGN',               'EXPENSE',   'NGN', 'NG', 0.00),
    (v_agent_org,  'COMMISSION-PAYABLE-NGN',   'Agent Commission Payable — NGN',               'LIABILITY', 'NGN', 'NG', 0.00),
    (v_adashi_org, 'OPERATIONAL-LOSS-NGN',     'Operational Loss — Adashi over-payout — NGN',  'EXPENSE',   'NGN', 'NG', 0.00)
  ON CONFLICT (account_number) DO NOTHING;

  -- Operational suspense liability per org/currency in use: the sanctioned
  -- parking place for unidentified/unreconciled value.
  INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
  SELECT d.org_id, 'SUSPENSE-' || d.currency, 'Operational Suspense — ' || d.currency, 'LIABILITY', d.currency, d.country, 0.00
  FROM (SELECT DISTINCT org_id, currency, country FROM public.ledger_accounts WHERE account_number NOT LIKE 'SUSPENSE-%') d
  ON CONFLICT (account_number) DO NOTHING;
END;
$do$;

-- =============================================================================
-- S9. Historical repairs (honest restatement via adjustment journals)
-- =============================================================================

DO $do$
DECLARE
  v_agent_org UUID;
  v_adashi_org UUID;
  v_recalc JSONB;
BEGIN
  -- 9.1 Restate every stored balance from the journal (fixes treasury sign
  --     bugs, wallet-191, XOF-597 and any other drift in one honest sweep).
  v_recalc := public.recalculate_all_balances();
  RAISE NOTICE 'recalculate_all_balances: %', v_recalc;

  SELECT org_id INTO v_agent_org FROM public.ledger_accounts WHERE account_number = 'AGT-CASH-NG-0042' LIMIT 1;
  SELECT org_id INTO v_adashi_org FROM public.ledger_accounts WHERE account_number = 'ADASHI-ESCROW-NGN' LIMIT 1;

  -- 9.2 Agency fees (2 x NGN 100) were charged on SUCCESSFUL cash-in/out
  --     transactions before fee journalisation existed. Recognise them now:
  --     the agent holds the fee cash (receivable from agent), revenue earned.
  PERFORM public.post_adjustment_journal(
    v_agent_org, 'NGN', 'ADJ-20260914-001-AGENCY-FEES',
    'Recognise agency customer fees (2 x NGN 100) charged on SUCCESSFUL agency transactions before fee journalisation was implemented (assessment finding B6/F7): debit agent cash-in-hand (fees collected in cash, owed to KoriePay), credit agency fee revenue.',
    'accounting-integrity-remediation-2026-09-14',
    jsonb_build_array(
      jsonb_build_object('account_number', 'AGT-CASH-NG-0042', 'entry_type', 'DEBIT',  'amount', 200,
                         'narration', 'Agency fees collected in cash by agent AGT-NG-0042, payable to KoriePay (historical)'),
      jsonb_build_object('account_number', 'AGENCY-FEE-REVENUE-NGN', 'entry_type', 'CREDIT', 'amount', 200,
                         'narration', 'Agency fee revenue recognised for 2 historical SUCCESSFUL transactions')
    )
  );

  -- 9.3 Agent commissions (2 x NGN 30) were recorded in agent_commissions
  --     (EARNED) but never journalised. Accrue expense and payable now so
  --     that run_daily_settlement can only settle a funded payable.
  PERFORM public.post_adjustment_journal(
    v_agent_org, 'NGN', 'ADJ-20260914-002-COMMISSION-ACCRUAL',
    'Accrue agent commissions (2 x NGN 30) that were marked EARNED in agent_commissions without ever being journalised (assessment finding B6/F8): debit commission expense, credit commission payable.',
    'accounting-integrity-remediation-2026-09-14',
    jsonb_build_array(
      jsonb_build_object('account_number', 'COMMISSION-EXPENSE-NGN', 'entry_type', 'DEBIT',  'amount', 60,
                         'narration', 'Commission expense recognised for 2 historical EARNED commissions'),
      jsonb_build_object('account_number', 'COMMISSION-PAYABLE-NGN', 'entry_type', 'CREDIT', 'amount', 60,
                         'narration', 'Commission payable accrued for 2 historical EARNED commissions')
    )
  );

  -- 9.4 Adashi cycle-1 payout disbursed NGN 60,000 gross from an escrow that
  --     only ever held NGN 0 (contributions were never collected before the
  --     payout executed — case G3). The system as a whole created NGN 60,000.
  --     Recognise it honestly as an operational loss against the escrow so
  --     the escrow floors at zero and the loss is visible on the books.
  PERFORM public.post_adjustment_journal(
    v_adashi_org, 'NGN', 'ADJ-20260914-003-ADASHI-ESCROW-LOSS',
    'Recognise the NGN 60,000 Adashi cycle-1 over-payout (case G3): _execute_adashi_payout_disbursement disbursed gross from an unfunded escrow before the sufficiency control existed. Debit operational loss, credit the escrow so it floors at zero.',
    'accounting-integrity-remediation-2026-09-14',
    jsonb_build_array(
      jsonb_build_object('account_number', 'OPERATIONAL-LOSS-NGN', 'entry_type', 'DEBIT',  'amount', 60000,
                         'narration', 'Operational loss: Adashi cycle-1 payout disbursed from unfunded escrow'),
      jsonb_build_object('account_number', 'ADASHI-ESCROW-NGN', 'entry_type', 'CREDIT', 'amount', 60000,
                         'narration', 'Escrow restored to zero via recognised operational loss (case G3)')
    )
  );

  -- 9.5 Un-stamp merchant transactions that were swept into a FAILED batch
  --     and subsequently cancelled: they were never settled and must remain
  --     settleable. (The new guard trigger makes this impossible to recur.)
  UPDATE public.merchant_payment_transactions m
  SET settlement_batch_id = NULL
  WHERE m.status <> 'SUCCESSFUL'
    AND m.settlement_batch_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.merchant_settlement_batches b
      WHERE b.id = m.settlement_batch_id AND b.status = 'FAILED'
    );

  RAISE NOTICE 'repairs complete';
END;
$do$;

-- =============================================================================
-- S10. Custodial floors: ESCROW and FX-BOOK accounts can never be negative.
--      (Treasury/equity accounts may legitimately go negative — funding drawn
--      down — and clearing accounts are monitored by the daily close instead
--      of a hard floor, because outbound clearing can transiently overdraft
--      within a settlement window.)
-- =============================================================================

ALTER TABLE public.ledger_accounts DROP CONSTRAINT IF EXISTS chk_custodial_floor;
ALTER TABLE public.ledger_accounts
  ADD CONSTRAINT chk_custodial_floor CHECK (
    (account_number NOT LIKE '%ESCROW%' AND account_number NOT LIKE '%FX-BOOK%')
    OR balance >= 0
  );

-- =============================================================================
-- S11. Attach integrity constraint triggers (DEFERRED: checked at COMMIT, so
--      posting functions that insert entries then update balances in one
--      transaction are validated as a whole)
-- =============================================================================

-- B2: every journal must balance (debits = credits).
DROP TRIGGER IF EXISTS trg_ledger_txn_double_entry ON public.ledger_transactions;
CREATE CONSTRAINT TRIGGER trg_ledger_txn_double_entry
  AFTER INSERT ON public.ledger_transactions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.verify_double_entry_balance();

-- B1: any account touched by a new entry must satisfy stored = derived.
DROP TRIGGER IF EXISTS trg_entry_account_derivation ON public.ledger_entries;
CREATE CONSTRAINT TRIGGER trg_entry_account_derivation
  AFTER INSERT ON public.ledger_entries
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.verify_entry_account_balance();

-- B1: any stored balance change must match the journal-derived balance.
DROP TRIGGER IF EXISTS trg_account_balance_derivation ON public.ledger_accounts;
CREATE CONSTRAINT TRIGGER trg_account_balance_derivation
  AFTER UPDATE OF balance ON public.ledger_accounts
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.verify_account_balance_integrity();

-- B1: wallet balances must agree with their ledger accounts.
DROP TRIGGER IF EXISTS trg_wallet_ledger_sync ON public.wallets;
CREATE CONSTRAINT TRIGGER trg_wallet_ledger_sync
  AFTER UPDATE OF balance ON public.wallets
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.verify_wallet_ledger_sync();

-- Immediate guards: nothing opens with a non-zero balance.
DROP TRIGGER IF EXISTS trg_account_zero_opening ON public.ledger_accounts;
CREATE TRIGGER trg_account_zero_opening
  BEFORE INSERT ON public.ledger_accounts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_zero_opening_balance();

DROP TRIGGER IF EXISTS trg_wallet_zero_opening ON public.wallets;
CREATE TRIGGER trg_wallet_zero_opening
  BEFORE INSERT ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_zero_opening();

-- =============================================================================
-- S12. generate_trial_balance: per-account stored vs derived vs volumes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_trial_balance(p_org_id uuid DEFAULT NULL, p_as_of date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  account_number CHARACTER VARYING,
  account_name CHARACTER VARYING,
  account_type CHARACTER VARYING,
  currency CHARACTER VARYING,
  stored_balance NUMERIC,
  derived_balance NUMERIC,
  debit_volume NUMERIC,
  credit_volume NUMERIC,
  is_consistent BOOLEAN
)
LANGUAGE sql
STABLE
AS $function$
  SELECT la.account_number,
         la.name,
         la.type,
         la.currency,
         la.balance,
         COALESCE(SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END), 0),
         COALESCE(SUM(CASE WHEN e.entry_type = 'DEBIT'  THEN e.amount ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE 0 END), 0),
         la.balance = COALESCE(SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END), 0)
  FROM public.ledger_accounts la
  LEFT JOIN public.ledger_entries e
    ON e.account_id = la.id AND e.created_at::date <= p_as_of
  WHERE p_org_id IS NULL OR la.org_id = p_org_id
  GROUP BY la.id, la.account_number, la.name, la.type, la.currency, la.balance
  ORDER BY la.account_number;
$function$;

-- =============================================================================
-- S13. run_daily_financial_close: automated daily close (B9)
--      Idempotent (delete-then-insert per close_date). Writes
--      daily_financial_closes with per-currency metrics and exception detail.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.run_daily_financial_close(p_close_date date DEFAULT CURRENT_DATE, p_closed_by character varying DEFAULT 'system')
RETURNS public.daily_financial_closes
LANGUAGE plpgsql
AS $function$
DECLARE
  v_row public.daily_financial_closes;
  v_journals INT;
  v_debit_vol BIGINT;
  v_credit_vol BIGINT;
  v_per_currency JSONB;
  v_drift JSONB;
  v_wallet_desync JSONB;
  v_unbacked JSONB;
  v_negative JSONB;
  v_clearing_aging JSONB;
  v_commission_aging JSONB;
  v_deferred_fees JSONB;
  v_orphans INT;
  v_unbalanced_today INT := 0;
  v_exceptions INT := 0;
  v_equation BOOLEAN;
  v_commission_aging_count INT;
  v_commission_aging_amount NUMERIC(24,2);
BEGIN
  -- Journals and volumes for the close date.
  SELECT count(DISTINCT t.id),
         COALESCE(SUM(CASE WHEN e.entry_type = 'DEBIT'  THEN e.amount ELSE 0 END), 0)::bigint,
         COALESCE(SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE 0 END), 0)::bigint
  INTO v_journals, v_debit_vol, v_credit_vol
  FROM public.ledger_transactions t
  JOIN public.ledger_entries e ON e.transaction_id = t.id
  WHERE t.created_at::date = p_close_date;

  -- Unbalanced journals posted on the close date (should be impossible now).
  SELECT count(*) INTO v_unbalanced_today
  FROM (
    SELECT t.id
    FROM public.ledger_transactions t
    JOIN public.ledger_entries e ON e.transaction_id = t.id
    WHERE t.created_at::date = p_close_date
    GROUP BY t.id
    HAVING SUM(CASE WHEN e.entry_type = 'DEBIT'  THEN e.amount ELSE 0 END)
         <> SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE 0 END)
  ) u;

  -- Per-currency equation.
  SELECT jsonb_object_agg(s.currency, jsonb_build_object('journals', s.j, 'debits', s.d, 'credits', s.c, 'balanced', s.d = s.c))
  INTO v_per_currency
  FROM (
    SELECT t.currency,
           count(DISTINCT t.id) AS j,
           COALESCE(SUM(CASE WHEN e.entry_type = 'DEBIT'  THEN e.amount ELSE 0 END), 0) AS d,
           COALESCE(SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE 0 END), 0) AS c
    FROM public.ledger_transactions t
    JOIN public.ledger_entries e ON e.transaction_id = t.id
    WHERE t.created_at::date = p_close_date
    GROUP BY t.currency
  ) s;

  -- Accounts whose stored balance is not journal-derived.
  SELECT jsonb_agg(jsonb_build_object('account', x.account_number, 'stored', x.stored, 'derived', x.derived))
  INTO v_drift
  FROM (
    SELECT la.account_number, la.balance AS stored,
           COALESCE(SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END), 0) AS derived
    FROM public.ledger_accounts la
    LEFT JOIN public.ledger_entries e ON e.account_id = la.id
    GROUP BY la.id, la.account_number, la.balance
    HAVING la.balance <> COALESCE(SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END), 0)
  ) x;

  -- Wallets disagreeing with their ledger accounts.
  SELECT jsonb_agg(jsonb_build_object('wallet_id', w.id, 'wallet_balance', w.balance, 'ledger_balance', la.balance))
  INTO v_wallet_desync
  FROM public.wallets w
  JOIN public.ledger_accounts la ON la.id = w.ledger_account_id
  WHERE w.balance <> la.balance;

  -- Wallets that hold a balance with no ledger account behind them.
  SELECT jsonb_agg(jsonb_build_object('wallet_id', w.id, 'balance', w.balance))
  INTO v_unbacked
  FROM public.wallets w
  WHERE w.ledger_account_id IS NULL AND w.balance <> 0;

  -- Negative custodial accounts (escrow / clearing / FX book).
  SELECT jsonb_agg(jsonb_build_object('account', la.account_number, 'balance', la.balance))
  INTO v_negative
  FROM public.ledger_accounts la
  WHERE la.balance < 0
    AND (la.account_number LIKE '%ESCROW%' OR la.account_number LIKE '%CLEARING%' OR la.account_number LIKE '%FX-BOOK%');

  -- Clearing/escrow money sitting unmoved for more than 3 days (stuck
  -- provider settlements — the de facto transfer outage signature).
  SELECT jsonb_agg(jsonb_build_object('account', x.account_number, 'balance', x.balance, 'days_idle', x.age_days))
  INTO v_clearing_aging
  FROM (
    SELECT la.account_number, la.balance, (CURRENT_DATE - max(e.created_at)::date) AS age_days
    FROM public.ledger_accounts la
    JOIN public.ledger_entries e ON e.account_id = la.id
    WHERE (la.account_number LIKE '%CLEARING%' OR la.account_number LIKE '%ESCROW%') AND la.balance > 0
    GROUP BY la.id, la.account_number, la.balance
    HAVING max(e.created_at) < NOW() - INTERVAL '3 days'
  ) x;

  -- EARNED commissions unpaid for more than 7 days.
  SELECT count(*), COALESCE(SUM(amount), 0) INTO v_commission_aging_count, v_commission_aging_amount
  FROM public.agent_commissions
  WHERE status IN ('EARNED', 'PENDING_SETTLEMENT')
    AND earned_at < NOW() - INTERVAL '7 days';
  v_commission_aging := jsonb_build_object('count', v_commission_aging_count, 'amount', v_commission_aging_amount);

  -- Deferred (unearned) transfer fees per currency — informational.
  SELECT jsonb_object_agg(la.currency, la.balance)
  INTO v_deferred_fees
  FROM public.ledger_accounts la
  WHERE la.account_number LIKE 'TRANSFER-FEE-DEFERRED-%' AND la.balance <> 0;

  -- Orphan journals: posted but linked to no operational record. Sanctioned
  -- adjustment (ADJ-*) and funding (FUND-*/KP-*-FUND-*) journals are excluded.
  SELECT count(*) INTO v_orphans
  FROM public.ledger_transactions t
  WHERE t.transaction_reference NOT LIKE 'ADJ-%'
    AND t.transaction_reference NOT LIKE 'FUND-%'
    AND t.transaction_reference NOT LIKE 'KP-%-FUND-%'
    AND NOT EXISTS (SELECT 1 FROM public.customer_transactions c WHERE c.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.agency_transactions a WHERE a.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.merchant_payment_transactions m WHERE m.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.agent_float_topup_requests f WHERE f.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.settlement_batch_lines s WHERE s.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.merchant_settlement_batches b WHERE b.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM adashi.payouts p WHERE p.ledger_journal_id = t.id::text)
    AND NOT EXISTS (SELECT 1 FROM adashi.contribution_obligations o WHERE o.ledger_journal_id = t.id::text);

  v_equation := (v_drift IS NULL)
            AND (v_wallet_desync IS NULL)
            AND (v_unbalanced_today = 0)
            AND NOT EXISTS (
              SELECT 1 FROM jsonb_each(v_per_currency) AS k(ccy, v)
              WHERE NOT COALESCE((v ->> 'balanced')::boolean, TRUE)
            );

  v_exceptions := COALESCE(jsonb_array_length(v_drift), 0)
               + COALESCE(jsonb_array_length(v_wallet_desync), 0)
               + COALESCE(jsonb_array_length(v_unbacked), 0)
               + COALESCE(jsonb_array_length(v_negative), 0)
               + COALESCE(jsonb_array_length(v_clearing_aging), 0)
               + v_unbalanced_today
               + v_orphans;

  DELETE FROM public.daily_financial_closes WHERE close_date = p_close_date;

  INSERT INTO public.daily_financial_closes (
    close_date, status, total_journals_posted, total_debit_volume, total_credit_volume,
    is_equation_balanced, unresolved_exceptions_count, closed_by, metrics
  ) VALUES (
    p_close_date,
    CASE WHEN v_exceptions = 0 THEN 'CLOSED_BALANCED' ELSE 'CLOSED_WITH_EXCEPTIONS' END,
    v_journals,
    v_debit_vol,
    v_credit_vol,
    v_equation,
    v_exceptions,
    p_closed_by,
    jsonb_build_object(
      'per_currency', v_per_currency,
      'balance_drift_accounts', COALESCE(v_drift, '[]'::jsonb),
      'wallet_ledger_desync', COALESCE(v_wallet_desync, '[]'::jsonb),
      'unbacked_wallets', COALESCE(v_unbacked, '[]'::jsonb),
      'negative_custodial_accounts', COALESCE(v_negative, '[]'::jsonb),
      'clearing_aging_over_3d', COALESCE(v_clearing_aging, '[]'::jsonb),
      'earned_commission_aging_over_7d', v_commission_aging,
      'deferred_transfer_fees', COALESCE(v_deferred_fees, '{}'::jsonb),
      'unbalanced_journals_today', v_unbalanced_today,
      'orphan_ledger_transactions', v_orphans
    )
  )
  RETURNING * INTO v_row;

  INSERT INTO public.audit_events (org_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (
    NULL,
    '00000000-0000-4000-8000-000000000001',
    'system@koriepay.internal',
    'SYSTEM',
    'DAILY_FINANCIAL_CLOSE',
    'daily_financial_closes',
    v_row.id::text,
    jsonb_build_object('close_date', p_close_date, 'status', v_row.status,
                       'equation_balanced', v_equation, 'exceptions', v_exceptions, 'closed_by', p_closed_by),
    'db-function',
    'CLOSE-' || p_close_date::text,
    'CLOSE-' || p_close_date::text
  );

  RETURN v_row;
END;
$function$;

-- =============================================================================
-- S14. Run the first close (exercises S13 end-to-end and records the
--      post-remediation baseline; exceptions such as aged clearing money are
--      EXPECTED and honest until the provider rails are integrated)
-- =============================================================================

DO $do$
DECLARE
  v_close public.daily_financial_closes;
BEGIN
  v_close := public.run_daily_financial_close(CURRENT_DATE, 'migration-20260914000050');
  RAISE NOTICE 'daily close % : % (exceptions: %)', v_close.close_date, v_close.status, v_close.unresolved_exceptions_count;
END;
$do$;
