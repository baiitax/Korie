-- Migration: 20260904000022_enterprise_risk_management_grc.sql
-- Description: Enterprise Risk Management, Risk Appetite Framework, Control Library & Operational Loss Control Plane

-- ============================================================================
-- 1. RISK TAXONOMY & APPETITE FRAMEWORK
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_taxonomies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. LIQUIDITY_RISK, CYBERSECURITY_RISK
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    parent_category_id UUID REFERENCES risk_taxonomies(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_appetite_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. RAS-LIQ-BUFFER-01
    category_code VARCHAR(64) NOT NULL REFERENCES risk_taxonomies(category_code),
    title VARCHAR(255) NOT NULL,
    statement_text TEXT NOT NULL,
    target_metric VARCHAR(128) NOT NULL,
    appetite_level VARCHAR(32) NOT NULL CHECK (appetite_level IN ('ZERO_TOLERANCE', 'LOW', 'MODERATE', 'FLEXIBLE')),
    warning_threshold NUMERIC(18, 4) NOT NULL,
    breach_threshold NUMERIC(18, 4) NOT NULL,
    current_value NUMERIC(18, 4) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'WITHIN_APPETITE' CHECK (status IN (
        'WITHIN_APPETITE', 'EARLY_WARNING', 'BREACH', 'CRITICAL_BREACH'
    )),
    owner_role VARCHAR(128) NOT NULL,
    version VARCHAR(16) NOT NULL DEFAULT 'v1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. ENTERPRISE RISK REGISTER & CONTROL LIBRARY
-- ============================================================================

CREATE TABLE IF NOT EXISTS enterprise_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. RSK-OPS-SETTLE-01
    title VARCHAR(255) NOT NULL,
    category_code VARCHAR(64) NOT NULL REFERENCES risk_taxonomies(category_code),
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE', 'GLOBAL')),
    inherent_likelihood INTEGER NOT NULL CHECK (inherent_likelihood BETWEEN 1 AND 5),
    inherent_impact INTEGER NOT NULL CHECK (inherent_impact BETWEEN 1 AND 5),
    inherent_risk_score INTEGER NOT NULL, -- Likelihood * Impact (1-25)
    control_effectiveness_pct NUMERIC(5, 2) NOT NULL DEFAULT 80.00,
    residual_risk_score NUMERIC(5, 2) NOT NULL,
    risk_tier VARCHAR(16) NOT NULL CHECK (risk_tier IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    risk_owner VARCHAR(128) NOT NULL,
    treatment_strategy VARCHAR(32) NOT NULL CHECK (treatment_strategy IN ('MITIGATE', 'ACCEPT', 'TRANSFER', 'AVOID')),
    status VARCHAR(32) NOT NULL DEFAULT 'MONITORING' CHECK (status IN (
        'IDENTIFIED', 'ASSESSED', 'MITIGATION', 'MONITORING', 'ACCEPTED', 'CLOSED'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. CTRL-MAKER-CHECKER-01
    name VARCHAR(255) NOT NULL,
    control_type VARCHAR(32) NOT NULL CHECK (control_type IN ('PREVENTIVE', 'DETECTIVE', 'CORRECTIVE', 'COMPENSATING')),
    nature VARCHAR(32) NOT NULL CHECK (nature IN ('AUTOMATED', 'MANUAL', 'HYBRID_SEMI_AUTOMATED')),
    owner_role VARCHAR(128) NOT NULL,
    testing_frequency VARCHAR(32) NOT NULL CHECK (testing_frequency IN ('CONTINUOUS', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL')),
    effectiveness VARCHAR(32) NOT NULL DEFAULT 'EFFECTIVE' CHECK (effectiveness IN (
        'EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'NOT_TESTED'
    )),
    last_tested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. ISSUES, LOSS EVENTS & THIRD PARTIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. ISS-2026-0091
    risk_id UUID REFERENCES enterprise_risks(id) ON DELETE SET NULL,
    control_id UUID REFERENCES risk_controls(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    root_cause TEXT NOT NULL,
    remediation_action TEXT NOT NULL,
    assigned_owner VARCHAR(128) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN (
        'OPEN', 'IN_PROGRESS', 'PENDING_VALIDATION', 'CLOSED', 'OVERDUE'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operational_loss_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. LOSS-2026-0044
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL CHECK (category IN (
        'INTERNAL_FRAUD', 'EXTERNAL_FRAUD', 'EXECUTION_PROCESS_FAILURE',
        'BUSINESS_DISRUPTION', 'CLIENT_PRODUCT_PRACTICE'
    )),
    gross_loss_amount NUMERIC(18, 4) NOT NULL,
    recovered_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
    net_loss_amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    event_date DATE NOT NULL,
    root_cause TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'QUANTIFIED' CHECK (status IN (
        'DETECTED', 'RECORDED', 'QUANTIFIED', 'REMEDIED', 'CLOSED'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS third_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. VEN-PROVIDUS, VEN-G4S
    name VARCHAR(255) NOT NULL,
    vendor_type VARCHAR(64) NOT NULL CHECK (vendor_type IN (
        'CORRESPONDENT_BANK', 'PAYMENT_RAIL', 'CLOUD_HOSTING', 'CIT_COURIER', 'KYC_PROVIDER'
    )),
    criticality VARCHAR(16) NOT NULL CHECK (criticality IN ('TIER_1_MISSION_CRITICAL', 'TIER_2_HIGH_IMPACT', 'TIER_3_STANDARD')),
    risk_rating VARCHAR(16) NOT NULL DEFAULT 'LOW' CHECK (risk_rating IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    uptime_sla_target_pct NUMERIC(5, 2) NOT NULL DEFAULT 99.95,
    last_assessment_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- High-Performance ERM Indexes
CREATE INDEX IF NOT EXISTS idx_enterprise_risks_category ON enterprise_risks(category_code, risk_tier);
CREATE INDEX IF NOT EXISTS idx_risk_issues_status_severity ON risk_issues(status, severity);
CREATE INDEX IF NOT EXISTS idx_loss_events_date ON operational_loss_events(event_date, category);
