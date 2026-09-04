-- Migration: 20260903000013_agents_terminals_devices_regulatory_complaints.sql
-- Description: Comprehensive Tier-1 Agent Fleet, Device Trust, Terminal Geofencing, Consumer Protection & Regulatory Compliance Platform

-- ============================================================================
-- 1. AGENT MANAGEMENT & HIERARCHY
-- ============================================================================

CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_code VARCHAR(32) UNIQUE NOT NULL, -- e.g. AGT-NG-0092
    tenant_id UUID NOT NULL,
    identity_record_id VARCHAR(64), -- FK to Master Identity Record
    legal_name VARCHAR(128) NOT NULL,
    trading_name VARCHAR(128) NOT NULL,
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(128),
    
    -- Hierarchy
    region VARCHAR(64) NOT NULL,
    state_or_province VARCHAR(64) NOT NULL,
    lga_or_district VARCHAR(64) NOT NULL,
    branch_id UUID,
    aggregator_id UUID,
    
    -- Operational State Machine
    status VARCHAR(32) NOT NULL DEFAULT 'APPLICATION' CHECK (status IN (
        'PROSPECT', 'APPLICATION', 'KYC_PENDING', 'KYC_VERIFICATION', 'APPROVED',
        'TRAINING_REQUIRED', 'TRAINED', 'ACTIVATION_PENDING', 'ACTIVE',
        'RESTRICTED', 'SUSPENDED', 'UNDER_REVIEW', 'DEACTIVATED', 'TERMINATED'
    )),
    
    tier VARCHAR(16) NOT NULL DEFAULT 'TIER_1' CHECK (tier IN ('TIER_1', 'TIER_2', 'TIER_3', 'SUPER_AGENT')),
    quality_score NUMERIC(5, 2) DEFAULT 100.00 CHECK (quality_score BETWEEN 0 AND 100),
    risk_tier VARCHAR(16) DEFAULT 'LOW' CHECK (risk_tier IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- Limits
    daily_transaction_limit NUMERIC(18, 4) NOT NULL DEFAULT 500000,
    single_transaction_limit NUMERIC(18, 4) NOT NULL DEFAULT 100000,
    max_cash_holding NUMERIC(18, 4) NOT NULL DEFAULT 1000000,
    
    activated_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    previous_status VARCHAR(32) NOT NULL,
    new_status VARCHAR(32) NOT NULL,
    reason_code VARCHAR(64) NOT NULL,
    notes TEXT,
    actor_id UUID NOT NULL,
    actor_email VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. DEVICE MANAGEMENT & TRUST SCORING
-- ============================================================================

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(64) UNIQUE NOT NULL, -- Canonical UUID
    device_type VARCHAR(32) NOT NULL CHECK (device_type IN (
        'ANDROID', 'IOS', 'POS_HARDWARE', 'SMART_POS', 'TABLET', 'FIELD_TERMINAL', 'WEB_BROWSER'
    )),
    model_name VARCHAR(64) NOT NULL,
    os_version VARCHAR(32) NOT NULL,
    app_version VARCHAR(32) NOT NULL,
    
    -- Zero-Trust Identity
    public_key_pem TEXT,
    key_version INTEGER DEFAULT 1,
    attestation_status VARCHAR(32) DEFAULT 'VERIFIED' CHECK (attestation_status IN (
        'VERIFIED', 'FAILED', 'UNAVAILABLE', 'EXPIRED'
    )),
    trust_status VARCHAR(32) NOT NULL DEFAULT 'NORMAL' CHECK (trust_status IN (
        'TRUSTED', 'NORMAL', 'ELEVATED_RISK', 'HIGH_RISK', 'COMPROMISED', 'BLOCKED'
    )),
    trust_score NUMERIC(5, 2) DEFAULT 95.00 CHECK (trust_score BETWEEN 0 AND 100),
    
    assigned_agent_id UUID REFERENCES agents(id),
    is_compromised BOOLEAN DEFAULT FALSE,
    last_ip_address VARCHAR(45),
    last_location_lat NUMERIC(10, 6),
    last_location_lng NUMERIC(10, 6),
    last_active_at TIMESTAMPTZ,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(64) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    details JSONB NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. TERMINAL MANAGEMENT & GEOFENCING
-- ============================================================================

CREATE TABLE IF NOT EXISTS terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_id VARCHAR(32) UNIQUE NOT NULL, -- e.g. TID-NG-009182
    serial_number VARCHAR(64) UNIQUE NOT NULL,
    manufacturer VARCHAR(64) NOT NULL,
    model VARCHAR(64) NOT NULL,
    terminal_type VARCHAR(32) NOT NULL CHECK (terminal_type IN (
        'POS', 'SOFTPOS', 'ANDROID_POS', 'SMART_TERMINAL', 'KIOSK'
    )),
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE')),
    
    status VARCHAR(32) NOT NULL DEFAULT 'INVENTORIED' CHECK (status IN (
        'PROCURED', 'INVENTORIED', 'CONFIGURED', 'ASSIGNED', 'ACTIVATION_PENDING',
        'ACTIVE', 'DEGRADED', 'SUSPENDED', 'QUARANTINED', 'RETURNED', 'REPAIRED', 'REASSIGNED', 'RETIRED'
    )),
    
    assigned_agent_id UUID REFERENCES agents(id),
    assigned_merchant_id UUID,
    active_device_id VARCHAR(64) REFERENCES devices(device_id),
    
    -- Geofence & Location Telemetry
    registered_lat NUMERIC(10, 6),
    registered_lng NUMERIC(10, 6),
    geofence_radius_meters INTEGER DEFAULT 500,
    current_location_state VARCHAR(32) DEFAULT 'IN_ZONE' CHECK (current_location_state IN (
        'IN_ZONE', 'OUT_OF_ZONE', 'LOCATION_UNKNOWN', 'LOCATION_SUSPICIOUS', 'LOCATION_BLOCKED'
    )),
    last_known_lat NUMERIC(10, 6),
    last_known_lng NUMERIC(10, 6),
    last_heartbeat_at TIMESTAMPTZ,
    battery_level INTEGER CHECK (battery_level BETWEEN 0 AND 100),
    network_type VARCHAR(16),
    
    firmware_version VARCHAR(32) NOT NULL,
    app_version VARCHAR(32) NOT NULL,
    key_version INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS terminal_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_id UUID NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id),
    merchant_id UUID,
    assigned_by UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ,
    reason TEXT NOT NULL
);

-- ============================================================================
-- 4. CONSUMER PROTECTION, COMPLAINTS & DISPUTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. CMP-2026-00918
    customer_id UUID NOT NULL,
    customer_name VARCHAR(128) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE')),
    
    category VARCHAR(64) NOT NULL CHECK (category IN (
        'FAILED_TRANSFER', 'DUPLICATE_DEBIT', 'AGENT_OVERCHARGING', 'AGENT_HARASSMENT',
        'UNAUTHORIZED_TRANSACTION', 'POS_TERMINAL_GLITCH', 'REFUND_DELAY', 'FEE_DISPUTE', 'ACCOUNT_RESTRICTION'
    )),
    
    priority VARCHAR(16) NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
    status VARCHAR(32) NOT NULL DEFAULT 'OPENED' CHECK (status IN (
        'OPENED', 'ACKNOWLEDGED', 'CLASSIFIED', 'ASSIGNED', 'INVESTIGATING',
        'PENDING_CUSTOMER', 'PENDING_PROVIDER', 'RESOLUTION_PROPOSED', 'RESOLVED', 'CLOSED'
    )),
    
    -- Forensic Linkage
    transaction_reference VARCHAR(64),
    payment_id UUID,
    agent_id UUID REFERENCES agents(id),
    terminal_id UUID REFERENCES terminals(id),
    disputed_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL,
    
    description TEXT NOT NULL,
    assigned_to UUID,
    assigned_to_email VARCHAR(128),
    
    -- SLA Clock
    sla_due_at TIMESTAMPTZ NOT NULL,
    is_sla_breached BOOLEAN DEFAULT FALSE,
    
    resolution_type VARCHAR(64),
    resolution_notes TEXT,
    financial_compensation_amount NUMERIC(18, 4) DEFAULT 0,
    gl_journal_id UUID, -- FK to General Ledger posting
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS complaint_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    notes TEXT NOT NULL,
    actor_id UUID NOT NULL,
    actor_email VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. SYSTEMIC CUSTOMER HARM & INCIDENT MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS systemic_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. INC-2026-081
    title VARCHAR(256) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('SEV_1_CRITICAL', 'SEV_2_HIGH', 'SEV_3_MODERATE')),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN (
        'OPEN', 'INVESTIGATING', 'MITIGATED', 'REMEDIATING', 'RESOLVED', 'POSTMORTEM_PUBLISHED'
    )),
    
    affected_provider VARCHAR(64),
    affected_corridor VARCHAR(32),
    affected_customers_count INTEGER DEFAULT 0,
    affected_agents_count INTEGER DEFAULT 0,
    total_financial_exposure NUMERIC(18, 4) DEFAULT 0,
    currency VARCHAR(3) NOT NULL,
    
    root_cause TEXT,
    remediation_plan TEXT,
    regulatory_notified BOOLEAN DEFAULT FALSE,
    regulatory_filing_reference VARCHAR(128),
    
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mitigated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. REGULATORY COMPLIANCE, OBLIGATIONS & REPORTING
-- ============================================================================

CREATE TABLE IF NOT EXISTS regulatory_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. CBN-POS-DAILY-01
    jurisdiction VARCHAR(2) NOT NULL CHECK (jurisdiction IN ('NG', 'NE', 'REGIONAL_UEMOA')),
    regulator_name VARCHAR(128) NOT NULL, -- 'Central Bank of Nigeria', 'BCEAO'
    title VARCHAR(256) NOT NULL,
    frequency VARCHAR(32) NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ON_EVENT')),
    reporting_period VARCHAR(32) NOT NULL, -- '2026-09'
    due_date DATE NOT NULL,
    
    status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN (
        'NOT_STARTED', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'APPROVED', 'SUBMITTED', 'ACKNOWLEDGED', 'REJECTED', 'OVERDUE'
    )),
    
    responsible_department VARCHAR(64) NOT NULL,
    owner_email VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regulatory_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_reference VARCHAR(64) UNIQUE NOT NULL,
    obligation_id UUID NOT NULL REFERENCES regulatory_obligations(id),
    version INTEGER NOT NULL DEFAULT 1,
    reporting_period VARCHAR(32) NOT NULL,
    data_snapshot JSONB NOT NULL,
    data_hash VARCHAR(64) NOT NULL,
    
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'UNDER_REVIEW', 'APPROVED', 'SUBMITTED', 'ARCHIVED'
    )),
    
    preparer_email VARCHAR(128) NOT NULL,
    reviewer_email VARCHAR(128),
    approver_email VARCHAR(128),
    
    submission_receipt_hash VARCHAR(128),
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Ultra-High Performance Fleet & Audit Operations
CREATE INDEX IF NOT EXISTS idx_agents_code ON agents(agent_code);
CREATE INDEX IF NOT EXISTS idx_agents_status_country ON agents(status, country);
CREATE INDEX IF NOT EXISTS idx_terminals_tid ON terminals(terminal_id);
CREATE INDEX IF NOT EXISTS idx_terminals_agent ON terminals(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_devices_did ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_complaints_ref ON complaints(complaint_reference);
CREATE INDEX IF NOT EXISTS idx_complaints_customer_status ON complaints(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_regulatory_obligations_due ON regulatory_obligations(due_date, status);
