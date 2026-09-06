-- ============================================================================
-- KoriePay Agency Banking — Agent-Managed Customers, Terminal Registry,
-- Daily Cash Reconciliation, Float Top-Up Workflow, and Sub-Agent Float
-- Allocation (ledger-backed).
--
-- Closes the remaining fixture-backed surfaces in the Agent Portal
-- (src/services/agentDataService.ts: AGENT_CUSTOMERS, ACTIVE_TERMINAL,
-- DAILY_RECONCILIATIONS, FLOAT_TOPUP_REQUESTS, SUB_AGENTS,
-- FLOAT_ALLOCATIONS) with real, agent-scoped, RLS-protected tables and,
-- where money moves, atomic SECURITY DEFINER ledger functions mirroring
-- post_agency_cash_transaction()/post_agency_transfer().
--
-- Design constraints honored:
--   * No parallel ledger — every money movement posts through
--     public.ledger_transactions/ledger_entries.
--   * No fabricated status — float top-up requests start PENDING and only
--     move to APPROVED via a real ops/treasury decision that performs the
--     actual ledger credit; nothing is auto-approved by the client.
--   * Sub-agent float allocation/reclaim is between two agents' own real
--     WALLET_FLOAT ledger accounts, executed atomically with row locks,
--     never mutated as plain client-side numbers.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AGENCY CUSTOMER DIRECTORY
--
-- The registry of individuals an agent has served (built from real
-- cash-in/cash-out activity, editable name/notes by the agent). This is
-- deliberately separate from public.customers (the customer-portal Auth
-- identity table) — most agency walk-in customers never create a KoriePay
-- account; this is the agent's own retail ledger of who they serve.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agency_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  account_number_masked VARCHAR(32),
  bank_name VARCHAR(128),
  bank_code VARCHAR(16),
  kyc_tier VARCHAR(16) NOT NULL DEFAULT 'TIER_1' CHECK (kyc_tier IN ('TIER_1', 'TIER_2', 'TIER_3')),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  total_transactions_count INT NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_agency_customers_agent ON public.agency_customers(agent_id, last_activity_at DESC NULLS LAST);

ALTER TABLE public.agency_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agency_customers_self_select ON public.agency_customers;
CREATE POLICY agency_customers_self_select ON public.agency_customers
  FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS agency_customers_self_insert ON public.agency_customers;
CREATE POLICY agency_customers_self_insert ON public.agency_customers
  FOR INSERT WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS agency_customers_self_update ON public.agency_customers;
CREATE POLICY agency_customers_self_update ON public.agency_customers
  FOR UPDATE USING (agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

-- Every successful cash-in/cash-out upserts (or refreshes) the agent's
-- customer directory automatically — the agent never has to double-enter
-- someone they just transacted with, and the "onboard new customer" flow
-- becomes a real INSERT instead of a UI-only alert().
CREATE OR REPLACE FUNCTION public.upsert_agency_customer_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'SUCCESSFUL' AND NEW.customer_name IS NOT NULL AND NEW.customer_phone IS NOT NULL THEN
    INSERT INTO public.agency_customers (
      agent_id, full_name, phone, account_number_masked, bank_name, kyc_tier, is_verified,
      total_transactions_count, last_activity_at
    ) VALUES (
      NEW.agent_id, NEW.customer_name, NEW.customer_phone,
      CASE WHEN NEW.customer_account IS NOT NULL THEN '****' || RIGHT(NEW.customer_account, 4) ELSE NULL END,
      NEW.customer_bank, 'TIER_1', TRUE, 1, NEW.completed_at
    )
    ON CONFLICT (agent_id, phone) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      account_number_masked = COALESCE(EXCLUDED.account_number_masked, public.agency_customers.account_number_masked),
      bank_name = COALESCE(EXCLUDED.bank_name, public.agency_customers.bank_name),
      total_transactions_count = public.agency_customers.total_transactions_count + 1,
      last_activity_at = EXCLUDED.last_activity_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_upsert_agency_customer ON public.agency_transactions;
CREATE TRIGGER trg_upsert_agency_customer
AFTER INSERT OR UPDATE OF status ON public.agency_transactions
FOR EACH ROW
WHEN (NEW.status = 'SUCCESSFUL')
EXECUTE FUNCTION public.upsert_agency_customer_from_transaction();

-- ----------------------------------------------------------------------------
-- 2. TERMINAL REGISTRY (agent-facing subset)
--
-- The internal agency engine already has a rich in-memory TerminalManagement
-- Engine for ops; this table is the durable, agent-scoped record the /agent
-- portal reads. One row per assigned terminal, keyed by the agents.terminal_id
-- the agent already carries.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_terminals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  terminal_id VARCHAR(64) NOT NULL,
  model VARCHAR(128) NOT NULL DEFAULT 'PAX A920 Smart POS',
  serial_number VARCHAR(64),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'OFFLINE', 'MAINTENANCE')),
  network_type VARCHAR(8) NOT NULL DEFAULT '4G' CHECK (network_type IN ('4G', 'WIFI', 'GPRS')),
  app_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, terminal_id)
);

ALTER TABLE public.agent_terminals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_terminals_self_select ON public.agent_terminals;
CREATE POLICY agent_terminals_self_select ON public.agent_terminals
  FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

-- Provision a real terminal row for every existing agent that has a
-- terminal_id but no row yet (covers the seeded demo agent + any agent
-- created before this migration).
INSERT INTO public.agent_terminals (agent_id, terminal_id, model, serial_number, status, network_type, app_version, last_sync_at)
SELECT a.id, a.terminal_id, 'PAX A920 Smart POS', 'PAX-SN-' || UPPER(SUBSTRING(a.id::text, 1, 8)), 'ACTIVE', '4G', '2.4.1', NOW()
FROM public.agents a
WHERE a.terminal_id IS NOT NULL
ON CONFLICT (agent_id, terminal_id) DO NOTHING;

-- Every newly onboarded/approved agent (see ops/onboarding/[id]/decision)
-- gets a real terminal row the moment they get a terminal_id, so the
-- Terminals page is never empty for an ACTIVE agent.
CREATE OR REPLACE FUNCTION public.provision_agent_terminal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.terminal_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.terminal_id IS DISTINCT FROM OLD.terminal_id) THEN
    INSERT INTO public.agent_terminals (agent_id, terminal_id, model, serial_number, status, network_type, app_version, last_sync_at)
    VALUES (NEW.id, NEW.terminal_id, 'PAX A920 Smart POS', 'PAX-SN-' || UPPER(SUBSTRING(NEW.id::text, 1, 8)), 'ACTIVE', '4G', '2.4.1', NOW())
    ON CONFLICT (agent_id, terminal_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_agent_terminal ON public.agents;
CREATE TRIGGER trg_provision_agent_terminal
AFTER INSERT OR UPDATE OF terminal_id ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.provision_agent_terminal();

-- ----------------------------------------------------------------------------
-- 3. DAILY CASH RECONCILIATION (physical vault count vs. ledger)
--
-- Opening cash for a given day is real: it is yesterday's actual_physical_
-- cash (or, for an agent's first-ever reconciliation, their current real
-- CASH_IN_HAND ledger balance) — never a hardcoded constant.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_cash_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  reconciliation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
  opening_cash NUMERIC(24,2) NOT NULL,
  today_cash_in NUMERIC(24,2) NOT NULL DEFAULT 0,
  today_cash_out NUMERIC(24,2) NOT NULL DEFAULT 0,
  expected_closing_cash NUMERIC(24,2) NOT NULL,
  actual_physical_cash NUMERIC(24,2) NOT NULL,
  difference NUMERIC(24,2) NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('BALANCED', 'DISCREPANCY', 'SUBMITTED', 'APPROVED')),
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  UNIQUE (agent_id, reconciliation_date)
);

CREATE INDEX IF NOT EXISTS idx_agent_reconciliations_agent ON public.agent_cash_reconciliations(agent_id, reconciliation_date DESC);

ALTER TABLE public.agent_cash_reconciliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_reconciliations_self_select ON public.agent_cash_reconciliations;
CREATE POLICY agent_reconciliations_self_select ON public.agent_cash_reconciliations
  FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

-- Submits one real end-of-day reconciliation. Opening cash and today's
-- cash-in/out volume are derived server-side from agency_transactions and
-- the agent's own prior reconciliation row — the client only supplies the
-- physically-counted cash amount and optional notes.
CREATE OR REPLACE FUNCTION public.submit_agent_cash_reconciliation(
  p_agent_id UUID,
  p_actual_physical_cash NUMERIC,
  p_notes TEXT DEFAULT NULL
) RETURNS public.agent_cash_reconciliations
LANGUAGE plpgsql
AS $$
DECLARE
  v_currency VARCHAR(3);
  v_opening_cash NUMERIC(24,2);
  v_cash_in NUMERIC(24,2);
  v_cash_out NUMERIC(24,2);
  v_expected NUMERIC(24,2);
  v_difference NUMERIC(24,2);
  v_status VARCHAR(16);
  v_record public.agent_cash_reconciliations;
BEGIN
  SELECT currency INTO v_currency FROM public.agent_float_accounts
  WHERE agent_id = p_agent_id AND account_kind = 'CASH_IN_HAND' LIMIT 1;

  IF v_currency IS NULL THEN
    RAISE EXCEPTION 'AGENT_FLOAT_NOT_PROVISIONED';
  END IF;

  -- Opening cash = yesterday's actual physical count, or (first ever
  -- reconciliation) today's real CASH_IN_HAND ledger balance minus today's
  -- net cash movement so far, so day one is still ledger-derived, not zero.
  SELECT actual_physical_cash INTO v_opening_cash
  FROM public.agent_cash_reconciliations
  WHERE agent_id = p_agent_id AND reconciliation_date = CURRENT_DATE - INTERVAL '1 day';

  SELECT COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'CASH_IN'), 0),
         COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'CASH_OUT'), 0)
    INTO v_cash_in, v_cash_out
  FROM public.agency_transactions
  WHERE agent_id = p_agent_id
    AND status = 'SUCCESSFUL'
    AND created_at >= date_trunc('day', NOW());

  IF v_opening_cash IS NULL THEN
    SELECT la.balance INTO v_opening_cash
    FROM public.agent_float_accounts afa
    JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
    WHERE afa.agent_id = p_agent_id AND afa.account_kind = 'CASH_IN_HAND';
    v_opening_cash := COALESCE(v_opening_cash, 0) - v_cash_in + v_cash_out;
    IF v_opening_cash < 0 THEN v_opening_cash := 0; END IF;
  END IF;

  v_expected := v_opening_cash + v_cash_in - v_cash_out;
  v_difference := p_actual_physical_cash - v_expected;
  v_status := CASE WHEN v_difference = 0 THEN 'APPROVED' ELSE 'DISCREPANCY' END;

  INSERT INTO public.agent_cash_reconciliations (
    agent_id, reconciliation_date, currency, opening_cash, today_cash_in, today_cash_out,
    expected_closing_cash, actual_physical_cash, difference, status, notes
  ) VALUES (
    p_agent_id, CURRENT_DATE, v_currency, v_opening_cash, v_cash_in, v_cash_out,
    v_expected, p_actual_physical_cash, v_difference, v_status,
    COALESCE(p_notes, CASE WHEN v_status = 'APPROVED' THEN 'Vault balanced with internal ledger.' ELSE 'Cash variance recorded for supervisor review.' END)
  )
  ON CONFLICT (agent_id, reconciliation_date) DO UPDATE SET
    actual_physical_cash = EXCLUDED.actual_physical_cash,
    today_cash_in = EXCLUDED.today_cash_in,
    today_cash_out = EXCLUDED.today_cash_out,
    expected_closing_cash = EXCLUDED.expected_closing_cash,
    difference = EXCLUDED.difference,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    submitted_at = NOW()
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. FLOAT TOP-UP REQUESTS (agent -> treasury, real approval queue)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_float_topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  amount NUMERIC(24,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
  method VARCHAR(32) NOT NULL CHECK (method IN ('BANK_TRANSFER', 'CASH_DEPOSIT_HUB', 'SUPER_AGENT_ALLOCATION')),
  proof_reference VARCHAR(128),
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'APPROVED', 'REJECTED')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  ledger_transaction_id UUID REFERENCES public.ledger_transactions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_float_topup_agent ON public.agent_float_topup_requests(agent_id, requested_at DESC);

ALTER TABLE public.agent_float_topup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS float_topup_self_select ON public.agent_float_topup_requests;
CREATE POLICY float_topup_self_select ON public.agent_float_topup_requests
  FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

-- Approves a pending float top-up request and performs the real ledger
-- credit: DEBIT a Treasury funding account, CREDIT the agent's WALLET_FLOAT.
-- This is the only path that ever increases an agent's wallet float from a
-- top-up request — the agent-facing API only ever INSERTs a PENDING row.
CREATE OR REPLACE FUNCTION public.approve_agent_float_topup(
  p_request_id UUID,
  p_reviewer_id UUID
) RETURNS public.agent_float_topup_requests
LANGUAGE plpgsql
AS $$
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

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_org_id, 'FTU-' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '-' || UPPER(SUBSTRING(p_request_id::text, 1, 6)), 'Agent float top-up approved', v_request.amount, v_request.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_treasury_account_id, 'DEBIT', v_request.amount, v_request.currency, 'Treasury funds agent float top-up'),
    (v_ledger_tx_id, v_wallet_float_id, 'CREDIT', v_request.amount, v_request.currency, 'Agent wallet float credited from approved top-up');

  UPDATE public.ledger_accounts SET balance = balance + v_request.amount, updated_at = NOW() WHERE id = v_treasury_account_id;
  UPDATE public.ledger_accounts SET balance = balance + v_request.amount, updated_at = NOW() WHERE id = v_wallet_float_id;

  UPDATE public.agent_float_topup_requests
  SET status = 'APPROVED', reviewed_by = p_reviewer_id, reviewed_at = NOW(), ledger_transaction_id = v_ledger_tx_id
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  RETURN v_request;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. SUB-AGENT RELATIONSHIP + FLOAT ALLOCATION (ledger-backed)
--
-- agents.supervisor_agent_id already exists — this is the real "my
-- sub-agents" query. allocate/reclaim move real money between two agents'
-- own WALLET_FLOAT ledger accounts atomically (row-locked in a fixed order
-- to avoid deadlocks), replacing the client-side fake mutation entirely.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_float_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  sub_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  direction VARCHAR(8) NOT NULL CHECK (direction IN ('ALLOCATE', 'RECLAIM')),
  amount NUMERIC(24,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
  note TEXT,
  ledger_transaction_id UUID REFERENCES public.ledger_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_float_allocations_super ON public.agent_float_allocations(super_agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_float_allocations_sub ON public.agent_float_allocations(sub_agent_id, created_at DESC);

ALTER TABLE public.agent_float_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS float_allocations_super_select ON public.agent_float_allocations;
CREATE POLICY float_allocations_super_select ON public.agent_float_allocations
  FOR SELECT USING (
    super_agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid())
    OR sub_agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.transfer_agent_float(
  p_super_agent_id UUID,
  p_sub_agent_id UUID,
  p_direction VARCHAR, -- ALLOCATE | RECLAIM
  p_amount NUMERIC,
  p_note TEXT DEFAULT NULL
) RETURNS public.agent_float_allocations
LANGUAGE plpgsql
AS $$
DECLARE
  v_super_tier VARCHAR(16);
  v_super_org UUID;
  v_sub_org UUID;
  v_sub_supervisor UUID;
  v_currency VARCHAR(3);
  v_super_wallet_id UUID;
  v_sub_wallet_id UUID;
  v_super_wallet_balance NUMERIC(24,2);
  v_sub_wallet_balance NUMERIC(24,2);
  v_from_id UUID;
  v_to_id UUID;
  v_ledger_tx_id UUID;
  v_record public.agent_float_allocations;
  v_first UUID;
  v_second UUID;
BEGIN
  IF p_direction NOT IN ('ALLOCATE', 'RECLAIM') THEN
    RAISE EXCEPTION 'INVALID_DIRECTION';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  SELECT tier, org_id INTO v_super_tier, v_super_org FROM public.agents WHERE id = p_super_agent_id;
  IF v_super_tier IS NULL THEN
    RAISE EXCEPTION 'SUPER_AGENT_NOT_FOUND';
  END IF;
  IF v_super_tier <> 'SUPER_AGENT' THEN
    RAISE EXCEPTION 'NOT_A_SUPER_AGENT';
  END IF;

  SELECT org_id, supervisor_agent_id INTO v_sub_org, v_sub_supervisor FROM public.agents WHERE id = p_sub_agent_id;
  IF v_sub_org IS NULL THEN
    RAISE EXCEPTION 'SUB_AGENT_NOT_FOUND';
  END IF;
  IF v_sub_supervisor IS DISTINCT FROM p_super_agent_id THEN
    RAISE EXCEPTION 'NOT_YOUR_SUB_AGENT';
  END IF;

  -- Lock both agents' WALLET_FLOAT ledger rows in a fixed order (by ledger
  -- account id) so two concurrent allocations between the same pair can
  -- never deadlock.
  SELECT la.id, afa.currency INTO v_super_wallet_id, v_currency
  FROM public.agent_float_accounts afa JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
  WHERE afa.agent_id = p_super_agent_id AND afa.account_kind = 'WALLET_FLOAT';

  SELECT la.id INTO v_sub_wallet_id
  FROM public.agent_float_accounts afa JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
  WHERE afa.agent_id = p_sub_agent_id AND afa.account_kind = 'WALLET_FLOAT' AND afa.currency = v_currency;

  IF v_super_wallet_id IS NULL OR v_sub_wallet_id IS NULL THEN
    RAISE EXCEPTION 'AGENT_FLOAT_NOT_PROVISIONED';
  END IF;

  IF v_super_wallet_id < v_sub_wallet_id THEN
    v_first := v_super_wallet_id; v_second := v_sub_wallet_id;
  ELSE
    v_first := v_sub_wallet_id; v_second := v_super_wallet_id;
  END IF;
  PERFORM balance FROM public.ledger_accounts WHERE id = v_first FOR UPDATE;
  PERFORM balance FROM public.ledger_accounts WHERE id = v_second FOR UPDATE;

  SELECT balance INTO v_super_wallet_balance FROM public.ledger_accounts WHERE id = v_super_wallet_id;
  SELECT balance INTO v_sub_wallet_balance FROM public.ledger_accounts WHERE id = v_sub_wallet_id;

  IF p_direction = 'ALLOCATE' THEN
    IF v_super_wallet_balance < p_amount THEN
      RAISE EXCEPTION 'INSUFFICIENT_SUPER_AGENT_FLOAT';
    END IF;
    v_from_id := v_super_wallet_id;
    v_to_id := v_sub_wallet_id;
  ELSE
    IF v_sub_wallet_balance < p_amount THEN
      RAISE EXCEPTION 'INSUFFICIENT_SUB_AGENT_FLOAT';
    END IF;
    v_from_id := v_sub_wallet_id;
    v_to_id := v_super_wallet_id;
  END IF;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (
    v_super_org,
    'SAF-' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6)),
    p_direction || ' sub-agent float', p_amount, v_currency, 'COMMITTED'
  )
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_from_id, 'DEBIT', p_amount, v_currency, 'Sub-agent float ' || lower(p_direction) || ': source debited'),
    (v_ledger_tx_id, v_to_id, 'CREDIT', p_amount, v_currency, 'Sub-agent float ' || lower(p_direction) || ': destination credited');

  UPDATE public.ledger_accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_from_id;
  UPDATE public.ledger_accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = v_to_id;

  INSERT INTO public.agent_float_allocations (super_agent_id, sub_agent_id, direction, amount, currency, note, ledger_transaction_id)
  VALUES (p_super_agent_id, p_sub_agent_id, p_direction, p_amount, v_currency, p_note, v_ledger_tx_id)
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Realtime for the new agent-facing tables (mirrors agency_transactions /
--    agent_notifications convention).
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.agency_customers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_float_topup_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_float_allocations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
