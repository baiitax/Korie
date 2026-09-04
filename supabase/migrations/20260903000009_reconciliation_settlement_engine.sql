-- Migration: 20260903000009_reconciliation_settlement_engine.sql
-- Description: Authoritative Schema for Tier-1 Reconciliation, Bank Statement Ingestion, and Settlement Engine

-- ============================================================================
-- 1. RECONCILIATION RUNS & SOURCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reconciliation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_reference VARCHAR(64) UNIQUE NOT NULL,
    reconciliation_type VARCHAR(64) NOT NULL,
    entity_id UUID,
    country_code VARCHAR(16) NOT NULL DEFAULT 'NG',
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    provider_id VARCHAR(64) NOT NULL,
    source_period_start TIMESTAMPTZ NOT NULL,
    source_period_end TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'RUNNING',
    records_processed INTEGER NOT NULL DEFAULT 0,
    records_matched INTEGER NOT NULL DEFAULT 0,
    records_unmatched INTEGER NOT NULL DEFAULT 0,
    records_partial INTEGER NOT NULL DEFAULT 0,
    records_exception INTEGER NOT NULL DEFAULT 0,
    total_expected_minor BIGINT NOT NULL DEFAULT 0,
    total_actual_minor BIGINT NOT NULL DEFAULT 0,
    difference_amount_minor BIGINT NOT NULL DEFAULT 0,
    match_accuracy_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    initiated_by VARCHAR(255) NOT NULL DEFAULT 'SYSTEM_SCHEDULER',
    rule_version VARCHAR(16) NOT NULL DEFAULT 'v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reconciliation_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES public.reconciliation_runs(id) ON DELETE CASCADE,
    source_type VARCHAR(64) NOT NULL,
    provider_id VARCHAR(64),
    account_id VARCHAR(64),
    statement_reference VARCHAR(128),
    source_hash VARCHAR(128) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    currency VARCHAR(8) NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    total_amount_minor BIGINT NOT NULL DEFAULT 0,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'PROCESSED'
);

-- ============================================================================
-- 2. CANONICAL RECONCILIATION RECORDS & MATCHES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reconciliation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.reconciliation_runs(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES public.reconciliation_sources(id) ON DELETE CASCADE,
    source_record_reference VARCHAR(128) NOT NULL,
    transaction_reference VARCHAR(128),
    provider_reference VARCHAR(128),
    external_reference VARCHAR(128),
    account_reference VARCHAR(64) NOT NULL,
    record_type VARCHAR(16) NOT NULL, -- DEBIT, CREDIT
    direction VARCHAR(16) NOT NULL, -- INBOUND, OUTBOUND
    currency VARCHAR(8) NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
    fee_minor BIGINT NOT NULL DEFAULT 0,
    net_amount_minor BIGINT NOT NULL,
    value_date DATE NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL,
    settlement_date DATE,
    match_status VARCHAR(64) NOT NULL DEFAULT 'MANUAL_REVIEW',
    confidence_score INTEGER NOT NULL DEFAULT 0,
    matched_record_id UUID,
    raw_reference TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_run_source_ref UNIQUE (run_id, source_record_reference)
);

CREATE INDEX IF NOT EXISTS idx_recon_rec_tx_ref ON public.reconciliation_records(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_recon_rec_prov_ref ON public.reconciliation_records(provider_reference);
CREATE INDEX IF NOT EXISTS idx_recon_rec_run_status ON public.reconciliation_records(run_id, match_status);

-- ============================================================================
-- 3. RECONCILIATION EXCEPTIONS & EVIDENCE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reconciliation_exceptions_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exception_reference VARCHAR(64) UNIQUE NOT NULL,
    run_id UUID NOT NULL REFERENCES public.reconciliation_runs(id) ON DELETE CASCADE,
    transaction_id UUID,
    settlement_batch_id UUID,
    provider_id VARCHAR(64) NOT NULL,
    provider_reference VARCHAR(128),
    exception_type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'MEDIUM', -- CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
    expected_amount_minor BIGINT NOT NULL DEFAULT 0,
    actual_amount_minor BIGINT NOT NULL DEFAULT 0,
    difference_minor BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, ASSIGNED, INVESTIGATING, PENDING_MAKER_CHECKER, RESOLVED, ESCALATED, WRITTEN_OFF
    assigned_to VARCHAR(255),
    assigned_desk VARCHAR(64) DEFAULT 'TREASURY_RECON_DESK',
    sla_due_at TIMESTAMPTZ NOT NULL,
    is_sla_breached BOOLEAN NOT NULL DEFAULT false,
    root_cause VARCHAR(64) DEFAULT 'UNKNOWN',
    resolution_notes TEXT,
    resolution_code VARCHAR(64),
    maker_id VARCHAR(128),
    checker_id VARCHAR(128),
    compensating_journal_id UUID REFERENCES public.journal_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.reconciliation_exception_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exception_id UUID NOT NULL REFERENCES public.reconciliation_exceptions_v2(id) ON DELETE CASCADE,
    evidence_type VARCHAR(64) NOT NULL, -- BANK_STATEMENT, WEBHOOK_PAYLOAD, SCREENSHOT, EMAIL_LOG, DISPUTE_TICKET
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    file_hash VARCHAR(128) NOT NULL,
    notes TEXT,
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. BANK ACCOUNTS & BANK STATEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_code VARCHAR(32) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(32) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    country_code VARCHAR(16) NOT NULL DEFAULT 'NG',
    chart_account_code VARCHAR(32) NOT NULL REFERENCES public.chart_of_accounts(account_code),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bank_acc UNIQUE (bank_code, account_number, currency)
);

CREATE TABLE IF NOT EXISTS public.bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_reference VARCHAR(128) UNIQUE NOT NULL,
    bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id),
    currency VARCHAR(8) NOT NULL,
    statement_date DATE NOT NULL,
    opening_balance_minor BIGINT NOT NULL,
    closing_balance_minor BIGINT NOT NULL,
    total_credits_minor BIGINT NOT NULL DEFAULT 0,
    total_debits_minor BIGINT NOT NULL DEFAULT 0,
    line_count INTEGER NOT NULL DEFAULT 0,
    is_integrity_verified BOOLEAN NOT NULL DEFAULT false,
    file_hash VARCHAR(128) UNIQUE NOT NULL,
    imported_by VARCHAR(255) NOT NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bank_statement_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    value_date DATE NOT NULL,
    booking_date TIMESTAMPTZ NOT NULL,
    direction VARCHAR(16) NOT NULL, -- CREDIT, DEBIT
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency VARCHAR(8) NOT NULL,
    bank_reference VARCHAR(128) NOT NULL,
    narrative TEXT NOT NULL,
    channel VARCHAR(64),
    counterparty_account VARCHAR(64),
    counterparty_name VARCHAR(255),
    is_reconciled BOOLEAN NOT NULL DEFAULT false,
    reconciled_transaction_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_stmt_line UNIQUE (statement_id, sequence_number)
);

-- ============================================================================
-- 5. ENHANCED SETTLEMENT BATCHES & RESERVES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.settlement_batches_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_reference VARCHAR(64) UNIQUE NOT NULL,
    settlement_type VARCHAR(64) NOT NULL,
    partner_id UUID NOT NULL,
    partner_name VARCHAR(255) NOT NULL,
    partner_type VARCHAR(32) NOT NULL,
    country_code VARCHAR(16) NOT NULL DEFAULT 'NG',
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    source_account_code VARCHAR(32) NOT NULL REFERENCES public.chart_of_accounts(account_code),
    destination_account_code VARCHAR(32) NOT NULL REFERENCES public.chart_of_accounts(account_code),
    gross_amount_minor BIGINT NOT NULL DEFAULT 0,
    fees_minor BIGINT NOT NULL DEFAULT 0,
    taxes_minor BIGINT NOT NULL DEFAULT 0,
    reserves_held_minor BIGINT NOT NULL DEFAULT 0,
    net_amount_minor BIGINT NOT NULL DEFAULT 0,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    payout_bank_code VARCHAR(32) NOT NULL,
    payout_account_number VARCHAR(32) NOT NULL,
    payout_account_name VARCHAR(255) NOT NULL,
    settlement_window VARCHAR(32) DEFAULT 'T+1',
    scheduled_at TIMESTAMPTZ NOT NULL,
    initiated_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    provider_payout_reference VARCHAR(128),
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    maker_id VARCHAR(128) NOT NULL,
    maker_email VARCHAR(255) NOT NULL,
    checker_id VARCHAR(128),
    checker_email VARCHAR(255),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settlement_reserve_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL,
    batch_id UUID REFERENCES public.settlement_batches_v2(id) ON DELETE SET NULL,
    reserve_type VARCHAR(64) NOT NULL DEFAULT 'ROLLING_RISK',
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    rate_bps INTEGER NOT NULL DEFAULT 500, -- 500 bps = 5%
    hold_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, RELEASED, CAPTURED
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at TIMESTAMPTZ
);
