-- =============================================================================
-- Migration: 20260907000037_tier_based_fx_swap_and_volume_limits.sql
-- Description:
--   1. Adds a real, ledger-backed wallet-to-wallet FX swap (BDC) function —
--      previously the customer FX page only *simulated* a swap client-side
--      and never posted anything.
--   2. Introduces KYC-tier-aware transaction-volume ceilings, grounded in
--      CBN's tiered-KYC framework (NGN) and BCEAO Instruction n°008-05-2015
--      (XOF) — see src/lib/compliance/tierLimits.ts for the cited figures,
--      mirrored here so the DB is the actual enforcement point (never just
--      the UI).
--   3. Wires the SAME tier ceiling into public.post_customer_transfer, since
--      before this migration the wallet's flat `daily_limit` column (500,000
--      for every tier) was the only thing enforced, silently contradicting
--      the tier capability table the app already displayed to customers.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------
-- 1. Per-tier compliance ceilings table (server-side source of truth,
--    mirrors src/lib/compliance/tierLimits.ts exactly).
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kyc_tier_volume_limits (
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    kyc_tier VARCHAR(16) NOT NULL CHECK (kyc_tier IN ('TIER_0', 'TIER_1', 'TIER_2', 'TIER_3')),
    volume_limit_major NUMERIC(24,2), -- NULL = unlimited (Tier 3)
    window_unit VARCHAR(8) NOT NULL CHECK (window_unit IN ('DAY', 'MONTH')),
    max_balance_major NUMERIC(24,2), -- NULL = unlimited
    citation TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (currency, kyc_tier)
);

INSERT INTO public.kyc_tier_volume_limits (currency, kyc_tier, volume_limit_major, window_unit, max_balance_major, citation) VALUES
  ('NGN', 'TIER_0', 0,          'DAY',   0,          'CBN Tiered-KYC Framework — Tier 0 (unverified) may not transact.'),
  ('NGN', 'TIER_1', 50000,      'DAY',   300000,     'CBN circular on Mobile Money daily transaction/balance limits (Sept 2017), tiered-KYC Tier 1.'),
  ('NGN', 'TIER_2', 200000,     'DAY',   500000,     'CBN Tiered-KYC Framework, Tier 2 (verified ID + address).'),
  ('NGN', 'TIER_3', 5000000,    'DAY',   NULL,       'CBN Tiered-KYC Framework, Tier 3 (full KYC incl. BVN/NIN) — no balance ceiling.'),
  ('XOF', 'TIER_0', 0,          'MONTH', 0,          'BCEAO Instruction n°008-05-2015 — unverified holders may not transact.'),
  ('XOF', 'TIER_1', 100000,     'MONTH', 200000,     'BCEAO Instruction n°008-05-2015, Art. 27 non-identified/basic e-money ceiling.'),
  ('XOF', 'TIER_2', 500000,     'MONTH', 1000000,    'BCEAO Instruction n°008-05-2015 — standard verified-ID e-money tier.'),
  ('XOF', 'TIER_3', 5000000,    'MONTH', NULL,       'BCEAO Instruction n°008-05-2015, Art. 26 — fully-verified tier, within the 10,000,000 FCFA/month statutory ceiling.')
ON CONFLICT (currency, kyc_tier) DO UPDATE SET
  volume_limit_major = EXCLUDED.volume_limit_major,
  window_unit = EXCLUDED.window_unit,
  max_balance_major = EXCLUDED.max_balance_major,
  citation = EXCLUDED.citation,
  updated_at = NOW();

ALTER TABLE public.kyc_tier_volume_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kyc_tier_volume_limits_read_all ON public.kyc_tier_volume_limits;
CREATE POLICY kyc_tier_volume_limits_read_all ON public.kyc_tier_volume_limits FOR SELECT USING (true);

-- -----------------------------------------------------------------------
-- 2. Helper: compute a customer's already-consumed volume within their
--    tier's compliance window (today for NGN/day-based tiers, current
--    calendar month for XOF/month-based tiers), across BOTH ordinary
--    transfers (customer_transactions) and FX swaps (customer_fx_swaps,
--    created below) — a customer cannot dodge their ceiling by using one
--    rail instead of the other.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_customer_tier_volume_consumed(
    p_customer_id UUID,
    p_currency VARCHAR(3),
    p_window VARCHAR(8)
)
RETURNS NUMERIC(24,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_transfer_total NUMERIC(24,2);
  v_swap_total NUMERIC(24,2);
BEGIN
  v_window_start := CASE p_window
    WHEN 'MONTH' THEN date_trunc('month', NOW())
    ELSE date_trunc('day', NOW())
  END;

  SELECT COALESCE(SUM(amount + fee), 0) INTO v_transfer_total
  FROM public.customer_transactions
  WHERE customer_id = p_customer_id
    AND currency = p_currency
    AND status IN ('SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION')
    AND created_at >= v_window_start;

  SELECT COALESCE(SUM(from_amount), 0) INTO v_swap_total
  FROM public.customer_fx_swaps
  WHERE customer_id = p_customer_id
    AND from_currency = p_currency
    AND status = 'COMPLETED'
    AND created_at >= v_window_start;

  RETURN v_transfer_total + v_swap_total;
END;
$$;

-- -----------------------------------------------------------------------
-- 3. Customer FX Swap (BDC) ledger table.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_fx_swaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    from_wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
    to_wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
    from_currency VARCHAR(3) NOT NULL CHECK (from_currency IN ('NGN', 'XOF')),
    to_currency VARCHAR(3) NOT NULL CHECK (to_currency IN ('NGN', 'XOF')),
    from_amount NUMERIC(24,2) NOT NULL CHECK (from_amount > 0),
    fee NUMERIC(24,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
    exchange_rate NUMERIC(18,6) NOT NULL CHECK (exchange_rate > 0),
    to_amount NUMERIC(24,2) NOT NULL CHECK (to_amount > 0),
    kyc_tier_at_swap VARCHAR(16) NOT NULL,
    ledger_transaction_id UUID REFERENCES public.ledger_transactions(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    reference VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'FAILED', 'REVERSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT customer_fx_swaps_currency_pair_check CHECK (from_currency <> to_currency),
    CONSTRAINT customer_fx_swaps_customer_idempotency_key UNIQUE (customer_id, idempotency_key),
    CONSTRAINT customer_fx_swaps_reference_key UNIQUE (reference)
);

CREATE INDEX IF NOT EXISTS idx_customer_fx_swaps_customer ON public.customer_fx_swaps(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_fx_swaps_wallet ON public.customer_fx_swaps(from_wallet_id);

ALTER TABLE public.customer_fx_swaps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_fx_swaps_self_select ON public.customer_fx_swaps;
CREATE POLICY customer_fx_swaps_self_select ON public.customer_fx_swaps FOR SELECT
  USING (customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid()));

-- -----------------------------------------------------------------------
-- 4. FX swap accounting/settlement account (KoriePay's own FX book — the
--    counterparty leg for every customer swap; without this the swap has
--    nowhere balanced to post the offsetting entries).
-- -----------------------------------------------------------------------
INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, status)
SELECT o.id, 'FX-BOOK-NG-NGN', 'KoriePay FX Book — NGN Leg', 'LIABILITY', 'NGN', 'NG', 'ACTIVE'
FROM public.organizations o WHERE o.id = '10000000-0000-0000-0000-000000000001'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, status)
SELECT o.id, 'FX-BOOK-NE-XOF', 'KoriePay FX Book — XOF Leg', 'LIABILITY', 'XOF', 'NE', 'ACTIVE'
FROM public.organizations o WHERE o.id = '10000000-0000-0000-0000-000000000002'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, status)
SELECT o.id, 'FX-REVENUE-NGN', 'FX Swap Fee Revenue — NGN', 'REVENUE', 'NGN', 'NG', 'ACTIVE'
FROM public.organizations o WHERE o.id = '10000000-0000-0000-0000-000000000001'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, status)
SELECT o.id, 'FX-REVENUE-XOF', 'FX Swap Fee Revenue — XOF', 'REVENUE', 'XOF', 'NE', 'ACTIVE'
FROM public.organizations o WHERE o.id = '10000000-0000-0000-0000-000000000002'
ON CONFLICT (account_number) DO NOTHING;

-- -----------------------------------------------------------------------
-- 5. The FX swap function itself. Locks both wallets (source + destination
--    for the SAME customer), enforces tier-based compliance ceilings (not
--    just the flat wallets.daily_limit), posts a real 4-leg balanced ledger
--    entry (source wallet debit, KoriePay FX book credit for the source
--    currency; KoriePay FX book debit, destination wallet credit for the
--    destination currency — two independent single-currency balanced legs,
--    since ledger_entries.currency is single-currency per row), and credits
--    the fee to FX revenue. This executes immediately (no
--    PENDING_PROVIDER_INTEGRATION stage) because both wallets are
--    KoriePay-custodied — there is no external payout rail involved, unlike
--    a bank transfer.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_customer_fx_swap(
    p_customer_id UUID,
    p_org_id UUID,
    p_from_wallet_id UUID,
    p_to_wallet_id UUID,
    p_from_amount NUMERIC(24,2),
    p_fee NUMERIC(24,2),
    p_exchange_rate NUMERIC(18,6),
    p_to_amount NUMERIC(24,2),
    p_idempotency_key VARCHAR(128),
    p_reference VARCHAR(64)
)
RETURNS public.customer_fx_swaps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_wallet public.wallets;
  v_to_wallet public.wallets;
  v_existing public.customer_fx_swaps;
  v_kyc_tier VARCHAR(16);
  v_tier_limit RECORD;
  v_consumed NUMERIC(24,2);
  v_debit_total NUMERIC(24,2);
  v_from_ledger_balance NUMERIC(24,2);
  v_fx_book_from_id UUID;
  v_fx_book_to_id UUID;
  v_fx_revenue_id UUID;
  v_ledger_tx_id UUID;
  v_swap public.customer_fx_swaps;
BEGIN
  -- Idempotency: replay returns the original row.
  SELECT * INTO v_existing
  FROM public.customer_fx_swaps
  WHERE customer_id = p_customer_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  IF p_from_amount <= 0 OR p_to_amount <= 0 OR p_exchange_rate <= 0 THEN
    RAISE EXCEPTION 'INVALID_SWAP_AMOUNT';
  END IF;

  v_debit_total := p_from_amount + p_fee;

  -- Lock source wallet (must belong to the same customer).
  SELECT * INTO v_from_wallet FROM public.wallets
  WHERE id = p_from_wallet_id AND customer_id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOURCE_WALLET_NOT_FOUND';
  END IF;
  IF v_from_wallet.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'WALLET_NOT_ACTIVE';
  END IF;

  -- Lock destination wallet (must ALSO belong to the same customer — a
  -- swap only ever moves a customer's own money between their own two
  -- currency wallets; it is never a disguised transfer to someone else).
  SELECT * INTO v_to_wallet FROM public.wallets
  WHERE id = p_to_wallet_id AND customer_id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DESTINATION_WALLET_NOT_FOUND';
  END IF;
  IF v_to_wallet.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'DESTINATION_WALLET_NOT_ACTIVE';
  END IF;
  IF v_from_wallet.currency = v_to_wallet.currency THEN
    RAISE EXCEPTION 'SAME_CURRENCY_SWAP_NOT_ALLOWED';
  END IF;

  -- ---- Tier-based compliance ceiling (the actual fix for requirement #1) ----
  SELECT kyc_tier INTO v_kyc_tier FROM public.customers WHERE id = p_customer_id FOR UPDATE;

  SELECT * INTO v_tier_limit
  FROM public.kyc_tier_volume_limits
  WHERE currency = v_from_wallet.currency AND kyc_tier = COALESCE(v_kyc_tier, 'TIER_0');

  IF NOT FOUND OR v_tier_limit.volume_limit_major IS NULL THEN
    -- Tier 3 (or an unmapped tier defaulting safely) — no ceiling to check,
    -- unless volume_limit_major is explicitly 0 for an unverified tier.
    NULL;
  ELSE
    IF v_tier_limit.volume_limit_major = 0 THEN
      RAISE EXCEPTION 'TIER_NOT_PERMITTED_TO_SWAP';
    END IF;

    v_consumed := public.get_customer_tier_volume_consumed(p_customer_id, v_from_wallet.currency, v_tier_limit.window_unit);
    IF (v_consumed + p_from_amount) > v_tier_limit.volume_limit_major THEN
      RAISE EXCEPTION 'TIER_VOLUME_LIMIT_EXCEEDED';
    END IF;
  END IF;

  -- Wallet flat daily_limit still applies as a secondary, per-wallet guard.
  IF v_debit_total > v_from_wallet.daily_limit THEN
    RAISE EXCEPTION 'DAILY_LIMIT_EXCEEDED';
  END IF;

  -- Balance check.
  SELECT balance INTO v_from_ledger_balance
  FROM public.ledger_accounts WHERE id = v_from_wallet.ledger_account_id FOR UPDATE;
  IF v_from_ledger_balance < v_debit_total THEN
    RAISE EXCEPTION 'INSUFFICIENT_WALLET_BALANCE';
  END IF;

  -- Destination tier max-balance ceiling: a swap must not push the
  -- destination wallet above what that tier is allowed to hold.
  SELECT * INTO v_tier_limit
  FROM public.kyc_tier_volume_limits
  WHERE currency = v_to_wallet.currency AND kyc_tier = COALESCE(v_kyc_tier, 'TIER_0');
  IF FOUND AND v_tier_limit.max_balance_major IS NOT NULL THEN
    IF (v_to_wallet.balance + p_to_amount) > v_tier_limit.max_balance_major THEN
      RAISE EXCEPTION 'TIER_MAX_BALANCE_EXCEEDED';
    END IF;
  END IF;

  SELECT id INTO v_fx_book_from_id FROM public.ledger_accounts
  WHERE org_id = p_org_id AND currency = v_from_wallet.currency AND account_number LIKE 'FX-BOOK-%';
  SELECT id INTO v_fx_book_to_id FROM public.ledger_accounts
  WHERE currency = v_to_wallet.currency AND account_number LIKE 'FX-BOOK-%';
  SELECT id INTO v_fx_revenue_id FROM public.ledger_accounts
  WHERE org_id = p_org_id AND currency = v_from_wallet.currency AND account_number LIKE 'FX-REVENUE-%';

  IF v_fx_book_from_id IS NULL OR v_fx_book_to_id IS NULL THEN
    RAISE EXCEPTION 'FX_BOOK_NOT_CONFIGURED';
  END IF;

  PERFORM 1 FROM public.ledger_accounts WHERE id IN (v_fx_book_from_id, v_fx_book_to_id, v_fx_revenue_id) FOR UPDATE;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (p_org_id, p_reference, 'Customer FX swap ' || v_from_wallet.currency || ' -> ' || v_to_wallet.currency, v_debit_total, v_from_wallet.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  -- Leg A (source currency, balanced): wallet debited for amount+fee;
  -- FX book credited for the swap principal; FX revenue credited for the fee.
  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_from_wallet.ledger_account_id, 'DEBIT', v_debit_total, v_from_wallet.currency, 'FX swap: source wallet debited (principal + fee)'),
    (v_ledger_tx_id, v_fx_book_from_id, 'CREDIT', p_from_amount, v_from_wallet.currency, 'FX swap: principal received into KoriePay FX book');

  IF p_fee > 0 AND v_fx_revenue_id IS NOT NULL THEN
    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES (v_ledger_tx_id, v_fx_revenue_id, 'CREDIT', p_fee, v_from_wallet.currency, 'FX swap: fee recognised as revenue');
  END IF;

  -- Leg B (destination currency, balanced): FX book debited (funds it
  -- already holds in the destination currency book), destination wallet credited.
  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_fx_book_to_id, 'DEBIT', p_to_amount, v_to_wallet.currency, 'FX swap: destination currency released from KoriePay FX book'),
    (v_ledger_tx_id, v_to_wallet.ledger_account_id, 'CREDIT', p_to_amount, v_to_wallet.currency, 'FX swap: destination wallet credited');

  UPDATE public.ledger_accounts SET balance = balance - v_debit_total, updated_at = NOW() WHERE id = v_from_wallet.ledger_account_id;
  UPDATE public.ledger_accounts SET balance = balance + p_from_amount, updated_at = NOW() WHERE id = v_fx_book_from_id;
  IF p_fee > 0 AND v_fx_revenue_id IS NOT NULL THEN
    UPDATE public.ledger_accounts SET balance = balance + p_fee, updated_at = NOW() WHERE id = v_fx_revenue_id;
  END IF;
  UPDATE public.ledger_accounts SET balance = balance - p_to_amount, updated_at = NOW() WHERE id = v_fx_book_to_id;
  UPDATE public.ledger_accounts SET balance = balance + p_to_amount, updated_at = NOW() WHERE id = v_to_wallet.ledger_account_id;

  UPDATE public.wallets SET balance = balance - v_debit_total, updated_at = NOW() WHERE id = p_from_wallet_id;
  UPDATE public.wallets SET balance = balance + p_to_amount, updated_at = NOW() WHERE id = p_to_wallet_id;

  INSERT INTO public.customer_fx_swaps (
    customer_id, org_id, from_wallet_id, to_wallet_id, from_currency, to_currency,
    from_amount, fee, exchange_rate, to_amount, kyc_tier_at_swap,
    ledger_transaction_id, idempotency_key, reference, status
  ) VALUES (
    p_customer_id, p_org_id, p_from_wallet_id, p_to_wallet_id, v_from_wallet.currency, v_to_wallet.currency,
    p_from_amount, p_fee, p_exchange_rate, p_to_amount, COALESCE(v_kyc_tier, 'TIER_0'),
    v_ledger_tx_id, p_idempotency_key, p_reference, 'COMPLETED'
  ) RETURNING * INTO v_swap;

  RETURN v_swap;
END;
$$;

-- -----------------------------------------------------------------------
-- 6. Retrofit public.post_customer_transfer: enforce the SAME tier ceiling
--    (previously only the flat wallets.daily_limit — 500,000 for every
--    tier — was checked, contradicting the tier capability table already
--    shown to customers in the app).
-- -----------------------------------------------------------------------
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
)
RETURNS public.customer_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  v_debit_total := p_amount + p_fee;

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

  -- ---- Tier-based compliance ceiling (NEW) ----
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

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (p_org_id, p_reference, p_transaction_type || ' pending provider settlement (customer)', v_debit_total, p_currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_wallet.ledger_account_id, 'DEBIT', v_debit_total, p_currency, 'Customer transfer: wallet debited (amount + fee)'),
    (v_ledger_tx_id, v_clearing_ledger_id, 'CREDIT', v_debit_total, p_currency, 'Customer transfer: staged to outbound clearing pending provider confirmation');

  UPDATE public.ledger_accounts SET balance = balance - v_debit_total, updated_at = NOW() WHERE id = v_wallet.ledger_account_id;
  UPDATE public.ledger_accounts SET balance = balance + v_debit_total, updated_at = NOW() WHERE id = v_clearing_ledger_id;

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

COMMIT;
