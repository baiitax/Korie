-- ==============================================================================
-- KORIEPAY TIER-1 FINANCIAL PLATFORM: DOUBLE-ENTRY ACCOUNTING LEDGER
-- Migration: 20260903000003_double_entry_ledger.sql
-- ==============================================================================

-- 1. Chart of Accounts / Ledger Accounts
CREATE TABLE IF NOT EXISTS public.ledger_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    account_number VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    country VARCHAR(16) NOT NULL CHECK (country IN ('NG', 'NE', 'CROSS_BORDER')),
    balance BIGINT NOT NULL DEFAULT 0, -- Minor units
    locked_balance BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESTRICTED', 'FROZEN', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_org ON public.ledger_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_type ON public.ledger_accounts(type);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_currency ON public.ledger_accounts(currency);

-- 2. Ledger Transactions (Group of Debits & Credits)
CREATE TABLE IF NOT EXISTS public.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    transaction_reference VARCHAR(128) NOT NULL UNIQUE,
    external_reference VARCHAR(128),
    description TEXT NOT NULL,
    total_amount BIGINT NOT NULL CHECK (total_amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    status VARCHAR(32) NOT NULL DEFAULT 'COMMITTED' CHECK (status IN ('PENDING', 'COMMITTED', 'REVERSED', 'DISPUTED')),
    outbox_event_id UUID,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_tx_reference ON public.ledger_transactions(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_org ON public.ledger_transactions(org_id);

-- 3. Individual Ledger Entries (Immutable Debit or Credit)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
    entry_type VARCHAR(16) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount BIGINT NOT NULL CHECK (amount > 0), -- Minor units
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    narration VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx ON public.ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON public.ledger_entries(account_id);

-- 4. Double-Entry Invariant Balancing Function & Trigger
CREATE OR REPLACE FUNCTION public.verify_double_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_debit_sum BIGINT;
    v_credit_sum BIGINT;
BEGIN
    -- Calculate sum of debits and credits for this transaction
    SELECT 
        COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0)
    INTO v_debit_sum, v_credit_sum
    FROM public.ledger_entries
    WHERE transaction_id = NEW.id;

    IF v_debit_sum <> v_credit_sum THEN
        RAISE EXCEPTION 'Double-entry ledger imbalance detected! Debits (%) != Credits (%) for transaction %', 
            v_debit_sum, v_credit_sum, NEW.transaction_reference;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Immutability Trigger: Prohibit Mutation of Committed Ledger Entries
CREATE OR REPLACE FUNCTION public.prohibit_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are strictly immutable. Updating or deleting financial records is prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prohibit_ledger_mutation ON public.ledger_entries;
CREATE TRIGGER trg_prohibit_ledger_mutation
    BEFORE UPDATE OR DELETE ON public.ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.prohibit_ledger_mutation();
