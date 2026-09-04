-- Migration: 20260903000012_payment_switch_and_finance_gl.sql
-- Description: Core Tier-1 Payment Orchestration Switch and Multi-Dimensional General Ledger Platform

-- ============================================================================
-- 1. PAYMENT SWITCH & ORCHESTRATION LAYER TABLES
-- ============================================================================

-- Master Payment Records (Execution & Financial Truth Separation)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(64) UNIQUE NOT NULL,
    external_reference VARCHAR(128),
    tenant_id UUID NOT NULL,
    customer_id UUID,
    merchant_id UUID,
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE', 'CROSS_BORDER')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    amount NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
    fee_amount NUMERIC(18, 4) DEFAULT 0 CHECK (fee_amount >= 0),
    vat_amount NUMERIC(18, 4) DEFAULT 0 CHECK (vat_amount >= 0),
    net_amount NUMERIC(18, 4) NOT NULL CHECK (net_amount > 0),
    direction VARCHAR(16) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND', 'FX_TRANSFER')),
    channel VARCHAR(32) NOT NULL CHECK (channel IN ('NIP', 'CARD', 'VIRTUAL_ACCOUNT', 'USSD', 'DIRECT_DEBIT', 'SAHEL_SWITCH')),
    
    -- Orthogonal 4-State Lifecycle
    business_state VARCHAR(32) NOT NULL DEFAULT 'INITIATED' CHECK (business_state IN (
        'INITIATED', 'PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'REVERSED', 'REFUNDED', 'DISPUTED'
    )),
    financial_state VARCHAR(32) NOT NULL DEFAULT 'UNPOSTED' CHECK (financial_state IN (
        'UNPOSTED', 'HELD', 'POSTED', 'PARTIALLY_REVERSED', 'FULLY_REVERSED'
    )),
    settlement_state VARCHAR(32) NOT NULL DEFAULT 'UNSETTLED' CHECK (settlement_state IN (
        'UNSETTLED', 'IN_SETTLEMENT', 'SETTLED', 'PARTIALLY_SETTLED', 'SETTLEMENT_EXCEPTION'
    )),
    reconciliation_state VARCHAR(32) NOT NULL DEFAULT 'UNRECONCILED' CHECK (reconciliation_state IN (
        'UNRECONCILED', 'MATCHED', 'MISMATCH', 'EXCEPTION', 'MANUAL_REVIEW'
    )),
    
    -- Routing & Provider Attribution
    selected_provider VARCHAR(64),
    active_attempt_id UUID,
    total_attempts INTEGER DEFAULT 0,
    
    -- Counterparty Metadata
    sender_account_number VARCHAR(32),
    sender_bank_code VARCHAR(16),
    sender_name VARCHAR(128),
    beneficiary_account_number VARCHAR(32),
    beneficiary_bank_code VARCHAR(16),
    beneficiary_name VARCHAR(128),
    narration TEXT,
    
    -- FX & Cross-Border Dimensions
    fx_quote_id UUID,
    fx_source_currency VARCHAR(3),
    fx_target_currency VARCHAR(3),
    fx_rate NUMERIC(18, 6),
    fx_target_amount NUMERIC(18, 4),
    
    -- Audit & Timestamps
    metadata JSONB DEFAULT '{}'::jsonb,
    idempotency_key VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_at TIMESTAMPTZ,
    posted_at TIMESTAMPTZ
);

-- Payment Execution Attempts (Isolation & Provider Latency Auditing)
CREATE TABLE IF NOT EXISTS payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    provider_code VARCHAR(64) NOT NULL,
    provider_node_url VARCHAR(256),
    provider_reference VARCHAR(128),
    session_id VARCHAR(128),
    
    status VARCHAR(32) NOT NULL DEFAULT 'INITIATED' CHECK (status IN (
        'INITIATED', 'SENT', 'PENDING', 'SUCCESS', 'FAILED', 'TIMED_OUT', 'CIRCUIT_BROKEN'
    )),
    
    request_headers JSONB,
    request_payload JSONB,
    response_headers JSONB,
    response_payload JSONB,
    response_code VARCHAR(32),
    response_message TEXT,
    
    latency_ms INTEGER,
    circuit_breaker_state VARCHAR(16) DEFAULT 'CLOSED',
    error_type VARCHAR(64),
    is_terminal BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_payment_attempt_number UNIQUE (payment_id, attempt_number)
);

-- Dynamic Routing Rules Table
CREATE TABLE IF NOT EXISTS provider_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country VARCHAR(2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    min_amount NUMERIC(18, 4) DEFAULT 0,
    max_amount NUMERIC(18, 4),
    primary_provider VARCHAR(64) NOT NULL,
    secondary_provider VARCHAR(64),
    fallback_provider VARCHAR(64),
    weight_primary INTEGER DEFAULT 100 CHECK (weight_primary BETWEEN 0 AND 100),
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Provider Webhook Ingestion & Audit
CREATE TABLE IF NOT EXISTS provider_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code VARCHAR(64) NOT NULL,
    event_id VARCHAR(128),
    event_type VARCHAR(64) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    raw_payload JSONB NOT NULL,
    headers JSONB NOT NULL,
    signature VARCHAR(256),
    is_signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
    processing_status VARCHAR(32) NOT NULL DEFAULT 'RECEIVED' CHECK (processing_status IN (
        'RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED', 'REPLAYED'
    )),
    payment_id UUID REFERENCES payments(id),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    CONSTRAINT uq_provider_event_id UNIQUE (provider_code, event_id)
);

-- ============================================================================
-- 2. MULTI-DIMENSIONAL GENERAL LEDGER (GL) TABLES
-- ============================================================================

-- Chart of Accounts Master
CREATE TABLE IF NOT EXISTS gl_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code VARCHAR(16) UNIQUE NOT NULL,
    account_name VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN (
        'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CLEARING', 'SUSPENSE'
    )),
    normal_balance VARCHAR(8) NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    parent_account_code VARCHAR(16) REFERENCES gl_accounts(account_code),
    currency VARCHAR(3) NOT NULL,
    is_subledger_control BOOLEAN DEFAULT FALSE,
    subledger_type VARCHAR(32),
    is_active BOOLEAN DEFAULT TRUE,
    allow_manual_posting BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Accounting Periods
CREATE TABLE IF NOT EXISTS accounting_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_name VARCHAR(32) UNIQUE NOT NULL, -- e.g. '2026-09'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_month INTEGER NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN (
        'OPEN', 'SOFT_CLOSED', 'CLOSED', 'LOCKED'
    )),
    closed_by UUID,
    closed_at TIMESTAMPTZ,
    locked_by UUID,
    locked_at TIMESTAMPTZ,
    reopened_by UUID,
    reopened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GL Journal Entries (Immutable Headers)
CREATE TABLE IF NOT EXISTS gl_journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_number VARCHAR(64) UNIQUE NOT NULL,
    period_id UUID NOT NULL REFERENCES accounting_periods(id),
    journal_date DATE NOT NULL,
    entry_type VARCHAR(32) NOT NULL CHECK (entry_type IN (
        'STANDARD', 'PAYMENT_SETTLEMENT', 'FX_REVALUATION', 'PERIOD_CLOSING', 'MANUAL_ADJUSTMENT', 'REVERSAL'
    )),
    source_module VARCHAR(32) NOT NULL CHECK (source_module IN (
        'PAYMENT_SWITCH', 'WALLET_SUBLEDGER', 'TREASURY', 'RECONCILIATION', 'MANUAL'
    )),
    source_reference VARCHAR(128),
    payment_id UUID REFERENCES payments(id),
    narration TEXT NOT NULL,
    currency VARCHAR(3) NOT NULL,
    total_debit NUMERIC(18, 4) NOT NULL CHECK (total_debit > 0),
    total_credit NUMERIC(18, 4) NOT NULL CHECK (total_credit > 0),
    is_balanced BOOLEAN GENERATED ALWAYS AS (total_debit = total_credit) STORED,
    status VARCHAR(16) NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED', 'REVERSED')),
    reversal_journal_id UUID REFERENCES gl_journals(id),
    posted_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GL Journal Lines (8 Multi-Dimensional Attributes)
CREATE TABLE IF NOT EXISTS gl_journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id UUID NOT NULL REFERENCES gl_journals(id) ON DELETE CASCADE,
    account_code VARCHAR(16) NOT NULL REFERENCES gl_accounts(account_code),
    entry_side VARCHAR(8) NOT NULL CHECK (entry_side IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    
    -- 8 Mandatory Analytical Dimensions
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE', 'CROSS_BORDER')),
    legal_entity VARCHAR(32) NOT NULL CHECK (legal_entity IN ('KORIE_NIGERIA_LTD', 'KORIE_NIGER_SA', 'KORIE_HOLDINGS')),
    product VARCHAR(32) NOT NULL CHECK (product IN ('WALLET_P2P', 'MERCHANT_CHECKOUT', 'AGENCY_BANKING', 'FX_REMITTANCE', 'TREASURY')),
    channel VARCHAR(32) NOT NULL CHECK (channel IN ('NIP', 'CARD', 'USSD', 'VIRTUAL_ACCOUNT', 'CASH_DESK', 'SYSTEM')),
    provider VARCHAR(32) CHECK (provider IN ('PROVIDUS_NG', 'KORIS_NE', 'INTERSWITCH', 'NIBSS', 'INTERNAL')),
    cost_center VARCHAR(32),
    profit_center VARCHAR(32),
    
    -- Subledger Linkage
    subledger_id UUID,
    subledger_entity_type VARCHAR(32),
    
    line_narration TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subledgers Table
CREATE TABLE IF NOT EXISTS gl_subledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subledger_type VARCHAR(32) NOT NULL CHECK (subledger_type IN (
        'CUSTOMER_WALLET', 'MERCHANT_PAYABLE', 'AGENT_FLOAT', 'PROVIDER_CLEARING', 'COMMISSION_PAYABLE'
    )),
    entity_id UUID NOT NULL,
    account_code VARCHAR(16) NOT NULL REFERENCES gl_accounts(account_code),
    currency VARCHAR(3) NOT NULL,
    country VARCHAR(2) NOT NULL,
    current_balance NUMERIC(18, 4) NOT NULL DEFAULT 0,
    held_balance NUMERIC(18, 4) NOT NULL DEFAULT 0,
    available_balance NUMERIC(18, 4) GENERATED ALWAYS AS (current_balance - held_balance) STORED,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_subledger_entity_currency UNIQUE (subledger_type, entity_id, currency)
);

-- Maker-Checker Approvals for Financial Control
CREATE TABLE IF NOT EXISTS maker_checker_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(64) NOT NULL CHECK (action_type IN (
        'MANUAL_JOURNAL_POST', 'PERIOD_CLOSE', 'PERIOD_LOCK', 'PERIOD_REOPEN', 'SUSPENSE_WRITEOFF', 'SETTLEMENT_OVERRIDE'
    )),
    maker_id UUID NOT NULL,
    maker_email VARCHAR(128) NOT NULL,
    maker_role VARCHAR(64) NOT NULL,
    maker_notes TEXT,
    payload JSONB NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'CANCELLED')),
    checker_id UUID,
    checker_email VARCHAR(128),
    checker_notes TEXT,
    approved_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Ultra-High Performance Switch & Audit
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_created ON payments(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_business_financial ON payments(business_state, financial_state);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_payment_id ON payment_attempts(payment_id);
CREATE INDEX IF NOT EXISTS idx_gl_journals_period_date ON gl_journals(period_id, journal_date);
CREATE INDEX IF NOT EXISTS idx_gl_journal_lines_account_dim ON gl_journal_lines(account_code, country, product, channel);
CREATE INDEX IF NOT EXISTS idx_gl_subledgers_entity ON gl_subledgers(entity_id, subledger_type);
