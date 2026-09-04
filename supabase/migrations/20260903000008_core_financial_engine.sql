-- Migration: 20260903000008_core_financial_engine.sql
-- Description: Authoritative Double-Entry Ledger and Core Financial Engine schema

-- ============================================================================
-- 1. ENUMS
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE accounting_category AS ENUM (
        'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CONTROL', 'SUSPENSE', 'CLEARING', 'MEMO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE journal_direction AS ENUM ('DEBIT', 'CREDIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE core_journal_status AS ENUM (
        'DRAFT', 'VALIDATING', 'READY', 'POSTING', 'POSTED', 'REJECTED', 'VOIDED', 'REVERSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE core_settlement_status AS ENUM (
        'CREATED', 'CALCULATING', 'VALIDATING', 'READY', 'SUBMITTED', 'PROCESSING', 'SETTLED', 'FAILED', 'PARTIALLY_SETTLED', 'RECONCILIATION_REQUIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE core_adjustment_status AS ENUM (
        'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'POSTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. CHART OF ACCOUNTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    account_code VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category accounting_category NOT NULL,
    normal_balance journal_direction NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    country VARCHAR(16) NOT NULL DEFAULT 'NG',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system_account BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Chart of Accounts
INSERT INTO public.chart_of_accounts (account_code, name, category, normal_balance, currency, country, description)
VALUES
    -- 1xxx: ASSETS
    ('1010', 'Providus Settlement Pool NGN', 'ASSET', 'DEBIT', 'NGN', 'NG', 'Bank settlement operating account at Providus Bank Nigeria'),
    ('1020', 'Koris Settlement Pool XOF', 'ASSET', 'DEBIT', 'XOF', 'NE', 'Bank settlement operating account at Koris Bank Niger Republic'),
    ('1030', 'Central Reserve USD Nostro', 'ASSET', 'DEBIT', 'USD', 'CROSS_BORDER', 'FX Nostro clearing balance in USD'),
    ('1110', 'Customer Transit Clearing NGN', 'ASSET', 'DEBIT', 'NGN', 'NG', 'In-flight NIP collections and card transit receivables'),
    ('1120', 'Agent Float Clearing XOF', 'ASSET', 'DEBIT', 'XOF', 'NE', 'In-flight agency cash-in transit receivables'),
    ('1210', 'Provider Receivables (Flutterwave/Paystack)', 'ASSET', 'DEBIT', 'NGN', 'NG', 'Receivables from aggregator card collections'),

    -- 2xxx: LIABILITIES
    ('2010', 'Customer Wallet Deposits NGN', 'LIABILITY', 'CREDIT', 'NGN', 'NG', 'Customer wallet balances payable on demand in NGN'),
    ('2020', 'Customer Wallet Deposits XOF', 'LIABILITY', 'CREDIT', 'XOF', 'NE', 'Customer wallet balances payable on demand in XOF'),
    ('2030', 'Agent Operational Float NGN', 'LIABILITY', 'CREDIT', 'NGN', 'NG', 'Agent wallet working capital liability NGN'),
    ('2040', 'Agent Operational Float XOF', 'LIABILITY', 'CREDIT', 'XOF', 'NE', 'Agent wallet working capital liability XOF'),
    ('2050', 'Merchant Payables NGN', 'LIABILITY', 'CREDIT', 'NGN', 'NG', 'Undispatched merchant checkout settlements in NGN'),
    ('2060', 'Merchant Payables XOF', 'LIABILITY', 'CREDIT', 'XOF', 'NE', 'Undispatched merchant checkout settlements in XOF'),
    ('2100', 'Dispute & Chargeback Reserves', 'LIABILITY', 'CREDIT', 'NGN', 'NG', 'Held reserves for contested customer transactions'),

    -- 3xxx: EQUITY
    ('3010', 'Retained Platform Earnings', 'EQUITY', 'CREDIT', 'NGN', 'CROSS_BORDER', 'Cumulative platform retained net profit'),
    ('3020', 'FX Realized Translation Reserve', 'EQUITY', 'CREDIT', 'NGN', 'CROSS_BORDER', 'Cumulative realized gain/loss from currency spreads'),

    -- 4xxx: REVENUE
    ('4010', 'Transfer Processing Fee Income NGN', 'REVENUE', 'CREDIT', 'NGN', 'NG', 'Fee revenue earned on customer P2P/NIP transfers'),
    ('4020', 'Transfer Processing Fee Income XOF', 'REVENUE', 'CREDIT', 'XOF', 'NE', 'Fee revenue earned on customer transfers in Niger'),
    ('4030', 'Merchant MDR Checkout Fee Income', 'REVENUE', 'CREDIT', 'NGN', 'NG', 'Merchant discount rate revenue from card & QR checkout'),
    ('4040', 'FX Cross-Border Spread Revenue', 'REVENUE', 'CREDIT', 'NGN', 'CROSS_BORDER', 'Spread earned on NGN/XOF currency conversion'),
    ('4050', 'Agency Cash-in/Cash-out Commission Revenue', 'REVENUE', 'CREDIT', 'NGN', 'NG', 'Platform fee take from agent transactions'),

    -- 5xxx: EXPENSES
    ('5010', 'Providus NIP Rail Interchange Expense', 'EXPENSE', 'DEBIT', 'NGN', 'NG', 'NIP switch interchange fee paid to bank'),
    ('5020', 'Koris Rail Processing Expense', 'EXPENSE', 'DEBIT', 'XOF', 'NE', 'Interbank rail processing cost in Niger'),
    ('5030', 'Agent Distribution Commission Expense', 'EXPENSE', 'DEBIT', 'NGN', 'NG', 'Commission paid out to agent network'),
    ('5040', 'Aggregator Gateway Processing Expense', 'EXPENSE', 'DEBIT', 'NGN', 'NG', 'Interchange and processing fees paid to card aggregators'),

    -- 6xxx: CONTROL & CLEARING
    ('6010', 'Cross-Border FX Bridge Clearing (NGN/XOF)', 'CONTROL', 'DEBIT', 'MULTI', 'CROSS_BORDER', 'Zero-sum clearing account for cross-border atomic transfers'),
    ('6020', 'Merchant Batch Settlement In-Flight', 'CLEARING', 'DEBIT', 'NGN', 'NG', 'Interim clearing for NIP payout batches'),

    -- 7xxx: SUSPENSE
    ('7100', 'Unallocated Inbound NIP Deposits Suspense', 'SUSPENSE', 'CREDIT', 'NGN', 'NG', 'Inbound bank transfers without matching virtual account'),
    ('7200', 'Failed Outbound Settlement Suspense', 'SUSPENSE', 'DEBIT', 'NGN', 'NG', 'Debited payout funds where bank status is unverified or timed out'),
    ('7300', 'Reconciliation Discrepancy Suspense', 'SUSPENSE', 'DEBIT', 'NGN', 'CROSS_BORDER', 'Audit discrepancies under manual maker-checker investigation')
ON CONFLICT (account_code) DO UPDATE 
SET name = EXCLUDED.name, 
    category = EXCLUDED.category, 
    normal_balance = EXCLUDED.normal_balance,
    currency = EXCLUDED.currency,
    country = EXCLUDED.country,
    description = EXCLUDED.description;

-- ============================================================================
-- 3. ACCOUNTING RULES ENGINE SCHEMA
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.accounting_rules (
    rule_code VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    transaction_type VARCHAR(64) NOT NULL,
    product VARCHAR(64) NOT NULL,
    country VARCHAR(16) NOT NULL,
    currency VARCHAR(8) NOT NULL,
    current_version VARCHAR(16) NOT NULL DEFAULT 'v1',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.accounting_rule_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code VARCHAR(64) NOT NULL REFERENCES public.accounting_rules(rule_code),
    version VARCHAR(16) NOT NULL,
    debit_account_code VARCHAR(32) NOT NULL REFERENCES public.chart_of_accounts(account_code),
    credit_account_code VARCHAR(32) NOT NULL REFERENCES public.chart_of_accounts(account_code),
    fee_debit_account_code VARCHAR(32) REFERENCES public.chart_of_accounts(account_code),
    fee_credit_account_code VARCHAR(32) REFERENCES public.chart_of_accounts(account_code),
    commission_debit_account_code VARCHAR(32) REFERENCES public.chart_of_accounts(account_code),
    commission_credit_account_code VARCHAR(32) REFERENCES public.chart_of_accounts(account_code),
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    approved_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (rule_code, version)
);

-- Seed Accounting Rules
INSERT INTO public.accounting_rules (rule_code, name, transaction_type, product, country, currency, current_version)
VALUES
    ('RULE_NGN_P2P_TRANSFER_v1', 'Nigeria Customer P2P Wallet Transfer', 'TRANSFER', 'WALLET', 'NG', 'NGN', 'v1'),
    ('RULE_XOF_P2P_TRANSFER_v1', 'Niger Customer P2P Wallet Transfer', 'TRANSFER', 'WALLET', 'NE', 'XOF', 'v1'),
    ('RULE_CROSS_BORDER_NG_NE_v1', 'Cross-Border Transfer Nigeria to Niger', 'CROSS_BORDER', 'REMITTANCE', 'CROSS_BORDER', 'NGN', 'v1'),
    ('RULE_MERCHANT_CHECKOUT_NGN_v1', 'Merchant Web Checkout Collection', 'CHECKOUT', 'PAYMENT', 'NG', 'NGN', 'v1'),
    ('RULE_MERCHANT_SETTLEMENT_NGN_v1', 'Merchant Batch Settlement Payout', 'SETTLEMENT', 'MERCHANT', 'NG', 'NGN', 'v1'),
    ('RULE_AGENCY_CASH_IN_v1', 'Agency Cash-in Deposit', 'CASH_IN', 'AGENCY', 'NG', 'NGN', 'v1'),
    ('RULE_AGENCY_CASH_OUT_v1', 'Agency Cash-out Withdrawal', 'CASH_OUT', 'AGENCY', 'NG', 'NGN', 'v1'),
    ('RULE_SUSPENSE_HOLD_v1', 'Suspense Account Transfer for Disputed Inbound', 'SUSPENSE_PARK', 'RECONCILIATION', 'NG', 'NGN', 'v1')
ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO public.accounting_rule_versions (rule_code, version, debit_account_code, credit_account_code, fee_debit_account_code, fee_credit_account_code, approved_by)
VALUES
    ('RULE_NGN_P2P_TRANSFER_v1', 'v1', '2010', '2010', '2010', '4010', 'CHIEF_FINANCIAL_OFFICER'),
    ('RULE_XOF_P2P_TRANSFER_v1', 'v1', '2020', '2020', '2020', '4020', 'CHIEF_FINANCIAL_OFFICER'),
    ('RULE_CROSS_BORDER_NG_NE_v1', 'v1', '2010', '6010', '2010', '4040', 'CHIEF_FINANCIAL_OFFICER'),
    ('RULE_MERCHANT_CHECKOUT_NGN_v1', 'v1', '1010', '2050', '2050', '4030', 'CHIEF_FINANCIAL_OFFICER'),
    ('RULE_MERCHANT_SETTLEMENT_NGN_v1', 'v1', '2050', '1010', NULL, NULL, 'CHIEF_FINANCIAL_OFFICER'),
    ('RULE_AGENCY_CASH_IN_v1', 'v1', '2030', '2010', '2030', '4050', 'CHIEF_FINANCIAL_OFFICER'),
    ('RULE_AGENCY_CASH_OUT_v1', 'v1', '2010', '2030', '2010', '4050', 'CHIEF_FINANCIAL_OFFICER'),
    ('RULE_SUSPENSE_HOLD_v1', 'v1', '1010', '7100', NULL, NULL, 'CHIEF_RISK_OFFICER')
ON CONFLICT (rule_code, version) DO NOTHING;

-- ============================================================================
-- 4. AUTHORITATIVE JOURNAL ENTRIES & LINES (IMMUTABLE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_number VARCHAR(64) UNIQUE NOT NULL,
    transaction_id UUID,
    event_id VARCHAR(128),
    rule_code VARCHAR(64) REFERENCES public.accounting_rules(rule_code),
    rule_version VARCHAR(16) DEFAULT 'v1',
    description TEXT NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    total_debit BIGINT NOT NULL CHECK (total_debit >= 0),
    total_credit BIGINT NOT NULL CHECK (total_credit >= 0),
    status core_journal_status NOT NULL DEFAULT 'POSTED',
    effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL DEFAULT 'SYSTEM_CORE',
    source_system VARCHAR(64) NOT NULL DEFAULT 'KORIEPAY_CORE',
    source_reference VARCHAR(128) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE,
    reversal_journal_id UUID REFERENCES public.journal_entries(id),
    CONSTRAINT chk_journal_balanced CHECK (total_debit = total_credit)
);

CREATE TABLE IF NOT EXISTS public.journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
    account_code VARCHAR(32) NOT NULL REFERENCES public.chart_of_accounts(account_code),
    category accounting_category NOT NULL,
    direction journal_direction NOT NULL,
    debit_amount BIGINT NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
    credit_amount BIGINT NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    narration TEXT,
    dimension JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_single_direction CHECK (
        (direction = 'DEBIT' AND debit_amount > 0 AND credit_amount = 0) OR
        (direction = 'CREDIT' AND credit_amount > 0 AND debit_amount = 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_account_code ON public.journal_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_journal_lines_journal_id ON public.journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_effective_at ON public.journal_entries(effective_at);
CREATE INDEX IF NOT EXISTS idx_journal_entries_txn_id ON public.journal_entries(transaction_id);

-- ============================================================================
-- 5. DERIVED PROJECTED ACCOUNT BALANCES (REBUILDABLE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.account_balances (
    account_code VARCHAR(32) PRIMARY KEY REFERENCES public.chart_of_accounts(account_code),
    posted_debit_total BIGINT NOT NULL DEFAULT 0,
    posted_credit_total BIGINT NOT NULL DEFAULT 0,
    calculated_balance BIGINT NOT NULL DEFAULT 0,
    locked_holds BIGINT NOT NULL DEFAULT 0,
    available_balance BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    last_journal_id UUID REFERENCES public.journal_entries(id),
    last_rebuilt_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. HOLDS AND RESERVES ENGINE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.account_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code VARCHAR(32) NOT NULL REFERENCES public.chart_of_accounts(account_code),
    customer_id UUID,
    merchant_id UUID,
    amount BIGINT NOT NULL CHECK (amount > 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    hold_reason VARCHAR(64) NOT NULL,
    reference_id VARCHAR(128) NOT NULL,
    expires_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, RELEASED, CAPTURED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at TIMESTAMPTZ
);

-- ============================================================================
-- 7. SETTLEMENT BATCHES & ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.settlement_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(64) UNIQUE NOT NULL,
    partner_id UUID,
    partner_type VARCHAR(32) NOT NULL, -- MERCHANT, AGENT, AGGREGATOR
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    gross_amount BIGINT NOT NULL DEFAULT 0,
    fee_deductions BIGINT NOT NULL DEFAULT 0,
    tax_deductions BIGINT NOT NULL DEFAULT 0,
    net_payable BIGINT NOT NULL DEFAULT 0,
    item_count INTEGER NOT NULL DEFAULT 0,
    status core_settlement_status NOT NULL DEFAULT 'CREATED',
    bank_payout_reference VARCHAR(128),
    payout_bank_code VARCHAR(32),
    payout_account_number VARCHAR(32),
    settlement_rule VARCHAR(64) DEFAULT 'T+1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.settlement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.settlement_batches(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL,
    gross_amount BIGINT NOT NULL,
    fee_amount BIGINT NOT NULL,
    net_amount BIGINT NOT NULL,
    currency VARCHAR(8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. RECONCILIATION ENGINE & SUSPENSE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reconciliation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_date DATE NOT NULL,
    country VARCHAR(16) NOT NULL DEFAULT 'NG',
    provider_code VARCHAR(64) NOT NULL,
    total_internal_records INTEGER NOT NULL DEFAULT 0,
    total_provider_records INTEGER NOT NULL DEFAULT 0,
    matched_records INTEGER NOT NULL DEFAULT 0,
    exception_records INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reconciliation_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.reconciliation_sessions(id),
    transaction_id UUID,
    provider_reference VARCHAR(128),
    discrepancy_type VARCHAR(64) NOT NULL,
    internal_amount BIGINT,
    provider_amount BIGINT,
    variance BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, RESOLVED, WRITTEN_OFF
    resolution_notes TEXT,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suspense_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suspense_account_code VARCHAR(32) NOT NULL REFERENCES public.chart_of_accounts(account_code),
    amount BIGINT NOT NULL CHECK (amount > 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    source_reference VARCHAR(128) NOT NULL,
    provider_code VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    age_days INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, INVESTIGATING, RESOLVED, WRITTEN_OFF
    owner_desk VARCHAR(64) NOT NULL DEFAULT 'TREASURY_OPS',
    resolution_journal_id UUID REFERENCES public.journal_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ============================================================================
-- 9. FINANCIAL ADJUSTMENTS (MAKER-CHECKER WORKFLOW)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.financial_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(64) UNIQUE NOT NULL,
    target_account_code VARCHAR(32) NOT NULL REFERENCES public.chart_of_accounts(account_code),
    offset_account_code VARCHAR(32) NOT NULL REFERENCES public.chart_of_accounts(account_code),
    amount BIGINT NOT NULL CHECK (amount > 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    direction journal_direction NOT NULL,
    reason TEXT NOT NULL,
    supporting_evidence TEXT,
    maker_id VARCHAR(128) NOT NULL,
    maker_email VARCHAR(255) NOT NULL,
    maker_role VARCHAR(64) NOT NULL,
    checker_id VARCHAR(128),
    checker_email VARCHAR(255),
    checker_role VARCHAR(64),
    status core_adjustment_status NOT NULL DEFAULT 'PENDING_APPROVAL',
    generated_journal_id UUID REFERENCES public.journal_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- ============================================================================
-- 10. DAILY FINANCIAL CLOSE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_financial_closes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    close_date DATE UNIQUE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
    total_journals_posted INTEGER NOT NULL DEFAULT 0,
    total_debit_volume BIGINT NOT NULL DEFAULT 0,
    total_credit_volume BIGINT NOT NULL DEFAULT 0,
    is_equation_balanced BOOLEAN NOT NULL DEFAULT true,
    unresolved_exceptions_count INTEGER NOT NULL DEFAULT 0,
    closed_by VARCHAR(255) NOT NULL DEFAULT 'AUTOMATED_FINANCIAL_CLOSE_DAEMON',
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 11. IMMUTABILITY TRIGGER (JOURNALS CANNOT BE MUTATED OR DELETED)
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_immutable_financial_records()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Double-Entry Financial Ledger Violation: Journal entries and lines are immutable and cannot be updated or deleted. You must post a compensating reversal journal.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_journal_entries ON public.journal_entries;
CREATE TRIGGER trg_protect_journal_entries
BEFORE UPDATE OR DELETE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION trg_immutable_financial_records();

DROP TRIGGER IF EXISTS trg_protect_journal_lines ON public.journal_lines;
CREATE TRIGGER trg_protect_journal_lines
BEFORE UPDATE OR DELETE ON public.journal_lines
FOR EACH ROW EXECUTE FUNCTION trg_immutable_financial_records();
