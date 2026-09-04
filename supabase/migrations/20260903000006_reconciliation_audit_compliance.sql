-- ==============================================================================
-- KORIEPAY TIER-1 FINANCIAL PLATFORM: RECONCILIATION, AUDIT & COMPLIANCE
-- Migration: 20260903000006_reconciliation_audit_compliance.sql
-- ==============================================================================

-- 1. Settlement Batches & Clearing Records
CREATE TABLE IF NOT EXISTS public.settlement_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    batch_reference VARCHAR(128) NOT NULL UNIQUE,
    settlement_node VARCHAR(64) NOT NULL, -- e.g. PROVIDUS_NG, KORIS_NE
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    total_transactions INT NOT NULL DEFAULT 0,
    gross_amount BIGINT NOT NULL DEFAULT 0,
    fee_amount BIGINT NOT NULL DEFAULT 0,
    net_settlement_amount BIGINT NOT NULL DEFAULT 0,
    settlement_account_nuban VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DISPUTED')),
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Automated 4-Way Reconciliation Runs & Discrepancy Registry
CREATE TABLE IF NOT EXISTS public.reconciliation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_date DATE NOT NULL,
    provider_code VARCHAR(32) NOT NULL,
    matched_count INT NOT NULL DEFAULT 0,
    unmatched_count INT NOT NULL DEFAULT 0,
    discrepancy_amount BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reconciliation_discrepancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reconciliation_run_id UUID NOT NULL REFERENCES public.reconciliation_runs(id) ON DELETE CASCADE,
    transaction_reference VARCHAR(128) NOT NULL,
    discrepancy_type VARCHAR(64) NOT NULL CHECK (discrepancy_type IN ('MISSING_IN_LEDGER', 'MISSING_AT_PROVIDER', 'AMOUNT_MISMATCH', 'STATUS_DRIFT', 'CURRENCY_MISMATCH')),
    internal_amount BIGINT,
    provider_amount BIGINT,
    internal_status VARCHAR(32),
    provider_status VARCHAR(32),
    resolution_status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (resolution_status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'WRITTEN_OFF')),
    resolution_notes TEXT,
    resolved_by VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Append-Only Immutable Audit Trail
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    actor_id VARCHAR(128) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128) NOT NULL,
    details TEXT NOT NULL,
    before_state JSONB,
    after_state JSONB,
    ip_address VARCHAR(64) NOT NULL,
    user_agent TEXT,
    request_id VARCHAR(128) NOT NULL,
    correlation_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_org_created ON public.audit_events(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_events_request_id ON public.audit_events(request_id);

-- Prohibit UPDATE and DELETE on public.audit_events
CREATE OR REPLACE FUNCTION public.prohibit_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit trail is strictly append-only. Mutation of audit records is illegal and prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prohibit_audit_mutation ON public.audit_events;
CREATE TRIGGER trg_prohibit_audit_mutation
    BEFORE UPDATE OR DELETE ON public.audit_events
    FOR EACH ROW
    EXECUTE FUNCTION public.prohibit_audit_mutation();
