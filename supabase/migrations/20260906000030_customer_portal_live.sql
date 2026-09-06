-- ==============================================================================
-- KORIEPAY CUSTOMER PORTAL — LIVE PRODUCTION SCHEMA (RECONCILIATION)
-- Migration: 20260906000030_customer_portal_live.sql
--
-- CONTEXT: this migration reconciles objects that were created directly on
-- the hosted Supabase project (via the SQL editor / ad-hoc DDL) while
-- building out real backend support for the Customer Wallet Portal
-- (/customer/*, /api/customer/*). None of it was previously captured in a
-- tracked migration file. Everything below is written idempotently
-- (IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT DO NOTHING) so it is
-- safe to run against the live database, which already has these objects,
-- and safe to run against a fresh database that does not.
--
-- MONEY REPRESENTATION: matches migration 20260906000028's established
-- convention — public.wallets and public.customer_transactions store
-- NUMERIC(24,2) MAJOR currency units (naira / CFA francs), not BIGINT minor
-- units. This supersedes the BIGINT-minor-units shape originally declared in
-- 20260903000002_customers_and_wallets.sql, which was never actually used in
-- production for the customer wallet balance column.
--
-- Design principles (same as Agency Banking):
--   - No parallel ledger. post_customer_transfer() posts real double-entry
--     rows into the EXISTING public.ledger_accounts / ledger_transactions /
--     ledger_entries tables, and re-uses the same
--     public.transfer_clearing_accounts staging table the agency transfer
--     path uses (created in 20260906000029).
--   - Honest-pending external leg: every customer transfer lands in
--     customer_transactions with status = 'PENDING_PROVIDER_INTEGRATION' and
--     provider_status = 'UNSENT'. Nothing here fabricates a SUCCESSFUL
--     external payout — there is no live Providus/Coris integration yet.
--   - RLS scopes every customer-owned table to `customers.auth_user_id =
--     auth.uid()`, i.e. real Supabase Auth identity, not a client-supplied id.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CUSTOMERS — add real-auth linkage + profile fields that were missing
--    from the original 20260903000002 definition.
-- ------------------------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS residential_address TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_auth_user_id_key'
  ) THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_auth_user ON public.customers(auth_user_id);

DROP POLICY IF EXISTS customers_self_select ON public.customers;
CREATE POLICY customers_self_select ON public.customers
  FOR SELECT USING (auth_user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 2. WALLETS — reconcile balance columns to the NUMERIC(24,2) major-unit
--    convention actually in use, and drop the unused daily_spent column
--    (daily spend is computed on demand from customer_transactions inside
--    post_customer_transfer(), not cached on the wallet row).
--
-- IMPORTANT: on the live database this table was already NUMERIC(24,2)
-- storing MAJOR units (matching ledger_accounts.balance) by the time this
-- migration was authored. This block only widens the type/precision and
-- sets defaults for a database that still has the original BIGINT-minor-unit
-- shape from 20260903000002 — it must NEVER divide an already-NUMERIC(24,2)
-- column by 100 again. The guard below only rescales when the column is
-- still an integer type; if it is already NUMERIC, it is left untouched.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_balance_type TEXT;
BEGIN
  SELECT data_type INTO v_balance_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'balance';

  IF v_balance_type IN ('bigint', 'integer', 'smallint') THEN
    -- Legacy minor-units column: rescale to major units while widening the type.
    ALTER TABLE public.wallets
      ALTER COLUMN balance TYPE NUMERIC(24,2) USING (balance::numeric / 100),
      ALTER COLUMN locked_balance TYPE NUMERIC(24,2) USING (locked_balance::numeric / 100),
      ALTER COLUMN daily_limit TYPE NUMERIC(24,2) USING (daily_limit::numeric / 100);
  END IF;
END $$;

ALTER TABLE public.wallets
  ALTER COLUMN balance SET DEFAULT 0.00,
  ALTER COLUMN locked_balance SET DEFAULT 0.00,
  ALTER COLUMN daily_limit SET DEFAULT 500000.00;

ALTER TABLE public.wallets DROP COLUMN IF EXISTS daily_spent;

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS account_number VARCHAR(32);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallets_account_number_key'
  ) THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_account_number_key UNIQUE (account_number);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wallets_ledger_account ON public.wallets(ledger_account_id);

ALTER TABLE public.wallets REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS wallets_self_select ON public.wallets;
CREATE POLICY wallets_self_select ON public.wallets
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 3. CUSTOMER_TRANSACTIONS — the customer-facing ledger-backed transaction
--    log (parallel in spirit to public.agency_transactions, but scoped to
--    wallet customers rather than agents).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  ledger_transaction_id UUID REFERENCES public.ledger_transactions(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  reference VARCHAR(64) NOT NULL UNIQUE,
  transaction_type VARCHAR(32) NOT NULL CHECK (transaction_type IN ('TRANSFER_NIP', 'TRANSFER_CROSS_BORDER', 'WALLET_FUNDING')),
  amount NUMERIC(24,2) NOT NULL CHECK (amount > 0),
  fee NUMERIC(24,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
  destination_currency VARCHAR(3) CHECK (destination_currency IN ('NGN', 'XOF')),
  exchange_rate NUMERIC(18,6),
  destination_amount NUMERIC(24,2),
  status VARCHAR(32) NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'REVERSED', 'PENDING_PROVIDER_INTEGRATION')),
  failure_reason TEXT,
  recipient_name VARCHAR(255),
  recipient_account VARCHAR(64),
  recipient_bank VARCHAR(128),
  recipient_bank_code VARCHAR(16),
  provider_name VARCHAR(64),
  provider_status VARCHAR(32),
  narration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (customer_id, idempotency_key)
);

COMMENT ON COLUMN public.customer_transactions.provider_status IS
  'Honest external-leg status. UNSENT until a real Providus/Coris integration exists — never fabricated as SENT/CONFIRMED.';

CREATE INDEX IF NOT EXISTS idx_customer_tx_customer ON public.customer_transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_tx_wallet ON public.customer_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_customer_tx_reference ON public.customer_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_customer_tx_status ON public.customer_transactions(status);

ALTER TABLE public.customer_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_tx_self_select ON public.customer_transactions;
CREATE POLICY customer_tx_self_select ON public.customer_transactions
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 4. CUSTOMER_BENEFICIARIES — saved payees, with the 24h new-payee cooldown
--    already enforced by BeneficiarySecurityEngine at the application layer.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  beneficiary_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(34) NOT NULL,
  bank_code VARCHAR(16) NOT NULL,
  bank_name VARCHAR(128) NOT NULL,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
  country VARCHAR(16) NOT NULL CHECK (country IN ('NG', 'NE')),
  nickname VARCHAR(64),
  relationship VARCHAR(64),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REMOVED')),
  cooldown_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, account_number, bank_code)
);

CREATE INDEX IF NOT EXISTS idx_customer_beneficiaries_customer ON public.customer_beneficiaries(customer_id);

ALTER TABLE public.customer_beneficiaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_beneficiaries_self_select ON public.customer_beneficiaries;
CREATE POLICY customer_beneficiaries_self_select ON public.customer_beneficiaries
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 5. CUSTOMER_DISPUTES — customer-raised complaint/dispute cases.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  transaction_reference VARCHAR(64) REFERENCES public.customer_transactions(reference) ON DELETE SET NULL,
  ticket_number VARCHAR(32) NOT NULL UNIQUE,
  category VARCHAR(32) NOT NULL CHECK (category IN ('FAILED_TRANSFER', 'DUPLICATE_DEBIT', 'UNAUTHORIZED_TRANSACTION', 'REFUND_DELAY', 'FEE_DISPUTE', 'ACCOUNT_RESTRICTION', 'OTHER')),
  disputed_amount NUMERIC(24,2),
  currency VARCHAR(3) CHECK (currency IN ('NGN', 'XOF')),
  description TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  priority VARCHAR(8) NOT NULL DEFAULT 'P2' CHECK (priority IN ('P1', 'P2', 'P3')),
  assigned_to UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_disputes_customer ON public.customer_disputes(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_disputes_status ON public.customer_disputes(status);

ALTER TABLE public.customer_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_disputes_self_select ON public.customer_disputes;
CREATE POLICY customer_disputes_self_select ON public.customer_disputes
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 6. CUSTOMER_KYC_DOCUMENTS — uploaded verification documents, metadata only
--    (the file itself lives in the private customer-kyc-documents bucket).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  document_type VARCHAR(32) NOT NULL CHECK (document_type IN ('PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE', 'CAC_CERTIFICATE', 'UTILITY_BILL', 'TAX_CLEARANCE')),
  storage_path TEXT NOT NULL,
  original_filename VARCHAR(255),
  mime_type VARCHAR(128),
  file_size_bytes BIGINT,
  sha256_hex VARCHAR(64),
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_kyc_docs_customer ON public.customer_kyc_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_kyc_docs_status ON public.customer_kyc_documents(status);

ALTER TABLE public.customer_kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_kyc_docs_self_select ON public.customer_kyc_documents;
CREATE POLICY customer_kyc_docs_self_select ON public.customer_kyc_documents
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 7. CUSTOMER_NOTIFICATIONS — in-app notification feed, auto-populated by
--    trg_notify_customer_on_transaction below.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  category VARCHAR(32) NOT NULL CHECK (category IN ('TRANSACTION', 'VERIFICATION', 'SECURITY', 'SYSTEM', 'SUPPORT')),
  severity VARCHAR(16) NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  related_transaction_id UUID REFERENCES public.customer_transactions(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer ON public.customer_notifications(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_unread ON public.customer_notifications(customer_id) WHERE (is_read = FALSE);

ALTER TABLE public.customer_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_notifications_self_select ON public.customer_notifications;
CREATE POLICY customer_notifications_self_select ON public.customer_notifications
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS customer_notifications_self_update ON public.customer_notifications;
CREATE POLICY customer_notifications_self_update ON public.customer_notifications
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
  ) WITH CHECK (
    customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 8. FX_RATES — administered NGN<->XOF execution rates. Single source of
--    truth so quote and executed rate can never diverge.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_currency VARCHAR(3) NOT NULL CHECK (source_currency IN ('NGN', 'XOF')),
  destination_currency VARCHAR(3) NOT NULL CHECK (destination_currency IN ('NGN', 'XOF')),
  rate NUMERIC(18,6) NOT NULL CHECK (rate > 0),
  source VARCHAR(64) NOT NULL DEFAULT 'KORIEPAY_ADMINISTERED',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_currency, destination_currency)
);

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fx_rates_read ON public.fx_rates;
CREATE POLICY fx_rates_read ON public.fx_rates
  FOR SELECT USING (auth.role() = 'authenticated');

INSERT INTO public.fx_rates (source_currency, destination_currency, rate, source)
VALUES
  ('NGN', 'XOF', 0.430000, 'KORIEPAY_ADMINISTERED_INITIAL'),
  ('XOF', 'NGN', 2.310000, 'KORIEPAY_ADMINISTERED_INITIAL')
ON CONFLICT (source_currency, destination_currency) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 9. FUNCTIONS — wallet provisioning, transfer posting, and the transaction
--    notification trigger. transfer_clearing_accounts already exists (created
--    by 20260906000029 for the agency transfer path); customer transfers
--    reuse the exact same clearing accounts, so no duplicate table/seed here.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_customer_wallet(
  p_customer_id UUID,
  p_org_id UUID,
  p_currency VARCHAR,
  p_country VARCHAR
) RETURNS public.wallets
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing public.wallets;
  v_ledger_id UUID;
  v_account_number VARCHAR(32);
BEGIN
  SELECT * INTO v_existing FROM public.wallets
  WHERE customer_id = p_customer_id AND currency = p_currency;
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  v_account_number := 'WAL-' || p_currency || '-' || substr(replace(p_customer_id::text, '-', ''), 1, 10) || '-' || floor(random() * 900 + 100)::int;

  INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
  VALUES (p_org_id, 'CUST-WAL-' || v_account_number, 'Customer Wallet — ' || p_currency, 'LIABILITY', p_currency, p_country, 0.00)
  RETURNING id INTO v_ledger_id;

  INSERT INTO public.wallets (customer_id, org_id, ledger_account_id, account_number, currency, country, balance)
  VALUES (p_customer_id, p_org_id, v_ledger_id, v_account_number, p_currency, p_country, 0.00)
  RETURNING * INTO v_existing;

  RETURN v_existing;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_customer_transfer(
  p_customer_id UUID,
  p_org_id UUID,
  p_wallet_id UUID,
  p_transaction_type VARCHAR,
  p_amount NUMERIC,
  p_currency VARCHAR,
  p_fee NUMERIC,
  p_destination_currency VARCHAR,
  p_exchange_rate NUMERIC,
  p_destination_amount NUMERIC,
  p_recipient_name VARCHAR,
  p_recipient_account VARCHAR,
  p_recipient_bank VARCHAR,
  p_recipient_bank_code VARCHAR,
  p_narration TEXT,
  p_idempotency_key VARCHAR,
  p_reference VARCHAR
) RETURNS public.customer_transactions
LANGUAGE plpgsql
AS $$
DECLARE
  v_wallet public.wallets;
  v_wallet_ledger_balance NUMERIC(24,2);
  v_clearing_ledger_id UUID;
  v_provider_name VARCHAR(64);
  v_existing public.customer_transactions;
  v_ledger_tx_id UUID;
  v_customer_tx public.customer_transactions;
  v_debit_total NUMERIC(24,2);
  v_today_spent NUMERIC(24,2);
BEGIN
  IF p_transaction_type NOT IN ('TRANSFER_NIP', 'TRANSFER_CROSS_BORDER') THEN
    RAISE EXCEPTION 'UNSUPPORTED_TRANSACTION_TYPE';
  END IF;

  -- Idempotency: replaying the same (customer, key) returns the original row
  -- rather than posting twice.
  SELECT * INTO v_existing
  FROM public.customer_transactions
  WHERE customer_id = p_customer_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  v_debit_total := p_amount + p_fee;

  -- Lock the wallet row (and its backing ledger account) before any check.
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

  SELECT balance INTO v_wallet_ledger_balance
  FROM public.ledger_accounts WHERE id = v_wallet.ledger_account_id FOR UPDATE;

  IF v_wallet_ledger_balance < v_debit_total THEN
    RAISE EXCEPTION 'INSUFFICIENT_WALLET_BALANCE';
  END IF;

  -- Daily wallet limit — computed on demand from today's postings, never
  -- bypassable regardless of caller.
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

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (p_org_id, p_reference, p_transaction_type || ' pending provider settlement (customer)', v_debit_total, p_currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_wallet.ledger_account_id, 'DEBIT', v_debit_total, p_currency, 'Customer transfer: wallet debited (amount + fee)'),
    (v_ledger_tx_id, v_clearing_ledger_id, 'CREDIT', v_debit_total, p_currency, 'Customer transfer: staged to outbound clearing pending provider confirmation');

  UPDATE public.ledger_accounts SET balance = balance - v_debit_total, updated_at = NOW() WHERE id = v_wallet.ledger_account_id;
  UPDATE public.ledger_accounts SET balance = balance + v_debit_total, updated_at = NOW() WHERE id = v_clearing_ledger_id;

  -- Keep wallets.balance as a synced cache of its own ledger account so
  -- existing read paths that select straight from wallets stay correct.
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
$$;

CREATE OR REPLACE FUNCTION public.notify_customer_on_transaction() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.customer_notifications (customer_id, category, severity, title, body, related_transaction_id)
    VALUES (
      NEW.customer_id,
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

DROP TRIGGER IF EXISTS trg_notify_customer_on_transaction ON public.customer_transactions;
CREATE TRIGGER trg_notify_customer_on_transaction
  AFTER INSERT OR UPDATE ON public.customer_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_customer_on_transaction();

-- ------------------------------------------------------------------------------
-- 10. STORAGE — private bucket for customer KYC document uploads. Access is
--     only ever granted server-side via signed URLs after an authorization
--     check (see /api/customer/portal/verification).
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('customer-kyc-documents', 'customer-kyc-documents', false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 11. REALTIME — expose live balance/transaction/notification updates to the
--     customer portal the same way the agency portal already does.
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customer_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_transactions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customer_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wallets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
  END IF;
END $$;
