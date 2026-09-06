-- ==============================================================================
-- KORIEPAY AGENCY BANKING — LIVE PRODUCTION SCHEMA
-- Migration: 20260906000028_agency_banking_live.sql
--
-- This migration adds the FIRST real backend support for the Agency Banking
-- (Agent) Portal. Prior to this migration, /agent/* was a fully frontend-mocked
-- surface with no database counterpart (verified by audit: zero rows / zero
-- tables for agents, agent float, or agent commissions existed in production).
--
-- MONEY REPRESENTATION: the live database's established convention (verified
-- against public.ledger_accounts, public.wallets, liquidity.*, adashi.*) is
-- NUMERIC(24,2) storing MAJOR currency units (e.g. naira, CFA francs) — NOT
-- BIGINT minor units as the earlier aspirational migration files assumed.
-- Every table below follows that same real convention for consistency.
--
-- Design principles:
--   - No parallel ledger. Every agent financial movement (cash-in, cash-out)
--     posts real double-entry rows into the EXISTING public.ledger_accounts /
--     ledger_transactions / ledger_entries tables.
--   - Agent float + cash-in-hand are represented as real ledger_accounts
--     (type=ASSET) scoped to the agent's organization, not ad-hoc numbers.
--   - Commission is computed and persisted server-side via a pricing table,
--     never hardcoded in the UI.
--   - RLS enforces that an agent can only see/operate on their own agent
--     record, their own float accounts, and their own commission ledger.
-- ==============================================================================

-- 1. AGENTS — the authorized field agent / agency banking operator
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    agent_code VARCHAR(32) NOT NULL UNIQUE,
    agent_name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(255) NOT NULL,
    country VARCHAR(16) NOT NULL CHECK (country IN ('NG', 'NE')),
    state_or_region VARCHAR(128),
    city_or_lga VARCHAR(128),
    tier VARCHAR(16) NOT NULL DEFAULT 'TIER_1' CHECK (tier IN ('TIER_1', 'TIER_2', 'SUPER_AGENT')),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'RESTRICTED', 'DEACTIVATED')),
    kyc_status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (kyc_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    supervisor_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    terminal_id VARCHAR(64),
    daily_cash_limit NUMERIC(24,2) NOT NULL DEFAULT 10000000.00,
    single_transaction_limit NUMERIC(24,2) NOT NULL DEFAULT 2000000.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_org ON public.agents(org_id);
CREATE INDEX IF NOT EXISTS idx_agents_auth_user ON public.agents(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON public.agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_supervisor ON public.agents(supervisor_agent_id);

-- 2. AGENT FLOAT ACCOUNTS — real ledger accounts representing an agent's
--    digital wallet float and physical cash-in-hand, per currency.
--    These ARE ledger_accounts rows (ASSET type); this table just indexes
--    them by agent + kind so the app can look them up quickly.
CREATE TABLE IF NOT EXISTS public.agent_float_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    ledger_account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
    account_kind VARCHAR(32) NOT NULL CHECK (account_kind IN ('WALLET_FLOAT', 'CASH_IN_HAND')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    cash_threshold_min NUMERIC(24,2) NOT NULL DEFAULT 200000.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, account_kind, currency)
);

CREATE INDEX IF NOT EXISTS idx_agent_float_accounts_agent ON public.agent_float_accounts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_float_accounts_ledger ON public.agent_float_accounts(ledger_account_id);

-- 3. AGENCY TRANSACTIONS — the agent-facing transaction record. Each row
--    is 1:1 with an authoritative public.ledger_transactions row.
CREATE TABLE IF NOT EXISTS public.agency_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
    ledger_transaction_id UUID REFERENCES public.ledger_transactions(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    reference VARCHAR(64) NOT NULL UNIQUE,
    transaction_type VARCHAR(32) NOT NULL CHECK (transaction_type IN ('CASH_IN', 'CASH_OUT', 'TRANSFER_NIP', 'TRANSFER_CROSS_BORDER')),
    amount NUMERIC(24,2) NOT NULL CHECK (amount > 0),
    customer_fee NUMERIC(24,2) NOT NULL DEFAULT 0,
    agent_commission NUMERIC(24,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    status VARCHAR(32) NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'REVERSED')),
    failure_reason TEXT,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(32),
    customer_account VARCHAR(64),
    customer_bank VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE (agent_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_agency_tx_agent ON public.agency_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agency_tx_customer ON public.agency_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_agency_tx_status ON public.agency_transactions(status);
CREATE INDEX IF NOT EXISTS idx_agency_tx_created ON public.agency_transactions(created_at DESC);

-- 4. AGENT COMMISSION RATES — authoritative pricing/commission matrix.
--    The UI must never hardcode a commission rate; it reads this table
--    (via the server) or the server computes off of it.
CREATE TABLE IF NOT EXISTS public.agent_commission_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(32) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    min_amount NUMERIC(24,2) NOT NULL DEFAULT 0,
    max_amount NUMERIC(24,2),
    customer_fee_flat NUMERIC(24,2) NOT NULL DEFAULT 0,
    customer_fee_bps INTEGER NOT NULL DEFAULT 0,
    agent_commission_flat NUMERIC(24,2) NOT NULL DEFAULT 0,
    agent_commission_bps INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (transaction_type, currency, min_amount)
);

-- 5. AGENT COMMISSION LEDGER — persisted commission earned per transaction,
--    with its own settlement lifecycle (separate from the customer-facing
--    double-entry transaction, but still traceable to it).
CREATE TABLE IF NOT EXISTS public.agent_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    agency_transaction_id UUID NOT NULL REFERENCES public.agency_transactions(id) ON DELETE CASCADE,
    amount NUMERIC(24,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    status VARCHAR(16) NOT NULL DEFAULT 'EARNED' CHECK (status IN ('EARNED', 'PENDING_SETTLEMENT', 'PAID')),
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_at TIMESTAMPTZ,
    UNIQUE (agency_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_commissions_agent ON public.agent_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_status ON public.agent_commissions(status);

-- 6. AUDIT LOG — every sensitive agent action.
CREATE TABLE IF NOT EXISTS public.agent_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64),
    target_id VARCHAR(128),
    result VARCHAR(16) NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE')),
    reason TEXT,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_audit_agent ON public.agent_audit_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_audit_created ON public.agent_audit_logs(created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_float_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commission_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_audit_logs ENABLE ROW LEVEL SECURITY;

-- An authenticated agent may only read their own agent record.
DROP POLICY IF EXISTS agents_self_select ON public.agents;
CREATE POLICY agents_self_select ON public.agents
    FOR SELECT
    USING (auth_user_id = auth.uid());

-- Service role (server) bypasses RLS by default; these policies protect
-- direct client (anon/authenticated) access only.
DROP POLICY IF EXISTS agent_float_self_select ON public.agent_float_accounts;
CREATE POLICY agent_float_self_select ON public.agent_float_accounts
    FOR SELECT
    USING (
        agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid())
    );

DROP POLICY IF EXISTS agency_tx_self_select ON public.agency_transactions;
CREATE POLICY agency_tx_self_select ON public.agency_transactions
    FOR SELECT
    USING (
        agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid())
    );

DROP POLICY IF EXISTS agent_commissions_self_select ON public.agent_commissions;
CREATE POLICY agent_commissions_self_select ON public.agent_commissions
    FOR SELECT
    USING (
        agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid())
    );

DROP POLICY IF EXISTS agent_commission_rates_read ON public.agent_commission_rates;
CREATE POLICY agent_commission_rates_read ON public.agent_commission_rates
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Agents may never read the audit log of another agent, and never write to it
-- directly (writes are server/service-role only, no INSERT policy granted).
DROP POLICY IF EXISTS agent_audit_self_select ON public.agent_audit_logs;
CREATE POLICY agent_audit_self_select ON public.agent_audit_logs
    FOR SELECT
    USING (
        agent_id IN (SELECT id FROM public.agents WHERE auth_user_id = auth.uid())
    );

-- ==============================================================================
-- AUTHORITATIVE COMMISSION MATRIX (seed baseline rates, MAJOR CURRENCY UNITS)
-- ==============================================================================
INSERT INTO public.agent_commission_rates
    (transaction_type, currency, min_amount, max_amount, customer_fee_flat, customer_fee_bps, agent_commission_flat, agent_commission_bps, is_active)
VALUES
    ('CASH_IN',  'NGN', 0, NULL, 100.00, 0, 35.00, 0, TRUE),
    ('CASH_OUT', 'NGN', 0, NULL, 100.00, 0, 25.00, 0, TRUE),
    ('CASH_IN',  'XOF', 0, NULL, 5.00,   0, 1.50,  0, TRUE),
    ('CASH_OUT', 'XOF', 0, NULL, 5.00,   0, 1.00,  0, TRUE)
ON CONFLICT (transaction_type, currency, min_amount) DO NOTHING;

-- ==============================================================================
-- ATOMIC CASH-IN / CASH-OUT POSTING FUNCTION
--
-- This is the single authoritative entry point for agency cash movements.
-- It runs inside one DB transaction: locks the agent's float + cash accounts
-- (SELECT ... FOR UPDATE), validates sufficiency, posts a balanced
-- double-entry ledger transaction, updates the agency_transactions row,
-- and writes the commission record. If ANY step fails, the whole thing
-- rolls back — there is no partial-success state.
--
-- All monetary parameters are NUMERIC(24,2) MAJOR currency units, matching
-- the live schema convention (ledger_accounts.balance, wallets.balance, etc).
-- ==============================================================================
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
BEGIN
    -- Idempotency: if this exact (agent, idempotency_key) already exists,
    -- return the original result instead of creating a duplicate.
    SELECT * INTO v_existing
    FROM public.agency_transactions
    WHERE agent_id = p_agent_id AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN v_existing;
    END IF;

    -- Lock the agent's float accounts for the duration of this transaction
    -- to prevent concurrent double-spend.
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

    -- CASH_IN: customer hands agent cash -> agent's cash-in-hand increases,
    -- wallet float decreases (agent credits customer's bank/wallet from float).
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

    -- Post the balanced double-entry ledger transaction.
    INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
    VALUES (p_org_id, p_reference, p_transaction_type || ' via agent', p_amount, p_currency, 'COMMITTED')
    RETURNING id INTO v_ledger_tx_id;

    IF p_transaction_type = 'CASH_IN' THEN
        -- Debit wallet float (asset decreases), credit cash-in-hand (asset increases)
        INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
        VALUES
            (v_ledger_tx_id, v_wallet_float_id, 'DEBIT', p_amount, p_currency, 'Cash-in: wallet float debited'),
            (v_ledger_tx_id, v_cash_hand_id, 'CREDIT', p_amount, p_currency, 'Cash-in: physical cash received');

        UPDATE public.ledger_accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_wallet_float_id;
        UPDATE public.ledger_accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = v_cash_hand_id;
    ELSE
        -- CASH_OUT: Debit cash-in-hand (asset decreases, cash dispensed), credit wallet float (asset increases)
        INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
        VALUES
            (v_ledger_tx_id, v_cash_hand_id, 'DEBIT', p_amount, p_currency, 'Cash-out: physical cash dispensed'),
            (v_ledger_tx_id, v_wallet_float_id, 'CREDIT', p_amount, p_currency, 'Cash-out: wallet float credited');

        UPDATE public.ledger_accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_cash_hand_id;
        UPDATE public.ledger_accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = v_wallet_float_id;
    END IF;

    -- Record the agent-facing transaction row, linked to the authoritative ledger tx.
    INSERT INTO public.agency_transactions (
        agent_id, ledger_transaction_id, idempotency_key, reference, transaction_type,
        amount, customer_fee, agent_commission, currency, status,
        customer_name, customer_phone, customer_account, customer_bank, completed_at
    ) VALUES (
        p_agent_id, v_ledger_tx_id, p_idempotency_key, p_reference, p_transaction_type,
        p_amount, p_customer_fee, p_agent_commission, p_currency, 'SUCCESSFUL',
        p_customer_name, p_customer_phone, p_customer_account, p_customer_bank, NOW()
    ) RETURNING * INTO v_agency_tx;

    -- Record commission (idempotent via UNIQUE(agency_transaction_id)).
    IF p_agent_commission > 0 THEN
        INSERT INTO public.agent_commissions (agent_id, agency_transaction_id, amount, currency, status)
        VALUES (p_agent_id, v_agency_tx.id, p_agent_commission, p_currency, 'EARNED');
    END IF;

    RETURN v_agency_tx;
END;
$$;
