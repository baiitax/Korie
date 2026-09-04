-- Migration: 20260904000017_transaction_recovery_disputes_and_refunds.sql
-- Description: Transaction Recovery, Refunds, Reversals, Disputes, Chargebacks & Financial Exception Management

-- ============================================================================
-- 1. TRANSACTION RECOVERY CASES & EXECUTION ATTEMPTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_recovery_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. REC-2026-00918
    transaction_reference VARCHAR(64) NOT NULL,
    customer_id UUID NOT NULL,
    merchant_id UUID,
    agent_id UUID,
    provider_id VARCHAR(64) NOT NULL,
    
    failure_category VARCHAR(64) NOT NULL CHECK (failure_category IN (
        'PROVIDER_TIMEOUT', 'UNKNOWN_PROVIDER_STATE', 'NETWORK_FAILURE',
        'DUPLICATE_DEBIT', 'SETTLEMENT_BREAK', 'PARTIAL_SUCCESS'
    )),
    financial_exposure NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    priority VARCHAR(16) NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
    
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED' CHECK (status IN (
        'QUEUED', 'INVESTIGATING', 'PROVIDER_QUERY', 'RETRY_PENDING',
        'REVERSAL_PENDING', 'REFUND_PENDING', 'MANUAL_REVIEW', 'RESOLVED', 'FAILED'
    )),
    
    assigned_team VARCHAR(64) NOT NULL DEFAULT 'Transaction Operations',
    assigned_user VARCHAR(128),
    sla_due_at TIMESTAMPTZ NOT NULL,
    resolution_code VARCHAR(64),
    resolution_reason TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transaction_execution_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_reference VARCHAR(64) NOT NULL,
    provider_id VARCHAR(64) NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    idempotency_key VARCHAR(128) NOT NULL,
    provider_reference VARCHAR(128),
    status VARCHAR(32) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'TIMEOUT', 'UNKNOWN')),
    error_code VARCHAR(64),
    latency_ms INTEGER NOT NULL DEFAULT 0,
    retryable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. PAYMENT REFUNDS & REVERSALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. REF-2026-0041
    original_transaction_reference VARCHAR(64) NOT NULL,
    customer_id UUID NOT NULL,
    merchant_id UUID,
    
    original_amount NUMERIC(18, 4) NOT NULL,
    refund_amount NUMERIC(18, 4) NOT NULL,
    remaining_refundable_amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    refund_type VARCHAR(32) NOT NULL CHECK (refund_type IN (
        'FULL_REFUND', 'PARTIAL_REFUND', 'MERCHANT_INITIATED', 'CUSTOMER_REQUESTED', 'SYSTEM_REFUND'
    )),
    status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED' CHECK (status IN (
        'REQUESTED', 'VALIDATING', 'APPROVAL_PENDING', 'APPROVED', 'SUBMITTED', 'PROCESSING', 'SUCCESS', 'FAILED'
    )),
    
    refund_reason TEXT NOT NULL,
    requested_by VARCHAR(128) NOT NULL,
    approved_by VARCHAR(128),
    gl_journal_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payment_reversals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reversal_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. REV-2026-0081
    original_transaction_reference VARCHAR(64) NOT NULL,
    reversal_amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    reversal_type VARCHAR(32) NOT NULL CHECK (reversal_type IN (
        'FULL_REVERSAL', 'PARTIAL_REVERSAL', 'AUTOMATIC_REVERSAL', 'MANUAL_REVERSAL'
    )),
    status VARCHAR(32) NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING', 'SUCCESS', 'FAILED')),
    reason TEXT NOT NULL,
    authorized_by VARCHAR(128) NOT NULL,
    gl_journal_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. DISPUTES, EVIDENCE & CHARGEBACKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS dispute_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. DISP-2026-0031
    transaction_reference VARCHAR(64) NOT NULL,
    claimant_id UUID NOT NULL,
    claimant_type VARCHAR(32) NOT NULL CHECK (claimant_type IN ('CUSTOMER', 'MERCHANT', 'AGENT')),
    
    category VARCHAR(64) NOT NULL CHECK (category IN (
        'DUPLICATE_CHARGE', 'TRANSACTION_NOT_RECOGNIZED', 'GOODS_NOT_RECEIVED',
        'SERVICE_NOT_RECEIVED', 'POS_CASH_DISPENSE_ERROR', 'AGENT_COMMISSION_DISPUTE', 'OTHER'
    )),
    claim_amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
    
    status VARCHAR(32) NOT NULL DEFAULT 'OPENED' CHECK (status IN (
        'OPENED', 'TRIAGED', 'UNDER_REVIEW', 'INFORMATION_REQUESTED',
        'EVIDENCE_COLLECTED', 'INVESTIGATION', 'DECISION_PENDING', 'RESOLVED'
    )),
    
    held_reserve_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
    sla_due_at TIMESTAMPTZ NOT NULL,
    resolution_outcome VARCHAR(64) CHECK (resolution_outcome IN (
        'CUSTOMER_FAVOUR', 'MERCHANT_FAVOUR', 'PROVIDER_FAVOUR', 'REFUND_EXECUTED', 'REVERSAL_EXECUTED', 'NO_ACTION'
    )),
    decision_notes TEXT,
    decided_by VARCHAR(128),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES dispute_cases(id) ON DELETE CASCADE,
    evidence_type VARCHAR(64) NOT NULL, -- RECEIPT, DELIVERY_NOTE, POS_JOURNAL
    file_name VARCHAR(128) NOT NULL,
    file_hash_sha256 VARCHAR(64) NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chargeback_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chargeback_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. CB-2026-0091
    dispute_id UUID REFERENCES dispute_cases(id),
    transaction_reference VARCHAR(64) NOT NULL,
    network_source VARCHAR(64) NOT NULL, -- NIBSS, GIM_UEMOA, VISA, MASTERCARD
    
    chargeback_amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    reason_code VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'CHARGEBACK_RECEIVED' CHECK (status IN (
        'CHARGEBACK_RECEIVED', 'CHARGEBACK_REVIEW', 'CHARGEBACK_ACCEPTED',
        'CHARGEBACK_CONTESTED', 'REPRESENTMENT', 'ARBITRATION', 'FINAL_LOSS', 'FINAL_WIN'
    )),
    
    response_deadline TIMESTAMPTZ NOT NULL,
    representment_evidence_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- High Performance Operational Indexes
CREATE INDEX IF NOT EXISTS idx_recovery_cases_status_sla ON transaction_recovery_cases(status, sla_due_at);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_orig_tx ON payment_refunds(original_transaction_reference);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_status ON dispute_cases(status, priority);
CREATE INDEX IF NOT EXISTS idx_chargeback_cases_status ON chargeback_cases(status, response_deadline);
