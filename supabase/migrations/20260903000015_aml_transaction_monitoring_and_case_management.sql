-- Migration: 20260903000015_aml_transaction_monitoring_and_case_management.sql
-- Description: Tier-1 AML Transaction Monitoring, Financial Crime Case Management & Graph Intelligence Platform

-- ============================================================================
-- 1. AML PROFILES & EXPECTED ACTIVITY BASELINES
-- ============================================================================

CREATE TABLE IF NOT EXISTS aml_customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL UNIQUE,
    jurisdiction VARCHAR(2) NOT NULL CHECK (jurisdiction IN ('NG', 'NE')),
    aml_risk_tier VARCHAR(16) NOT NULL DEFAULT 'LOW' CHECK (aml_risk_tier IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    aml_risk_score NUMERIC(5, 2) NOT NULL DEFAULT 15.00 CHECK (aml_risk_score BETWEEN 0 AND 100),
    
    -- Expected Activity Profile
    declared_monthly_income NUMERIC(18, 4) NOT NULL DEFAULT 500000,
    expected_monthly_volume NUMERIC(18, 4) NOT NULL DEFAULT 1000000,
    expected_max_single_tx NUMERIC(18, 4) NOT NULL DEFAULT 100000,
    expected_cash_usage_pct INTEGER DEFAULT 20,
    declared_source_of_funds VARCHAR(128) NOT NULL DEFAULT 'Salary / Business Revenue',
    is_pep BOOLEAN DEFAULT FALSE,
    pep_category VARCHAR(64),
    is_sanction_flagged BOOLEAN DEFAULT FALSE,
    has_adverse_media BOOLEAN DEFAULT FALSE,
    
    last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. AML SCENARIOS & VERSIONED DETECTION RULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS aml_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. AML_STRUC_01
    name VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN (
        'STRUCTURING', 'VELOCITY', 'PASS_THROUGH', 'DORMANT_REACTIVATION',
        'CASH_ANOMALY', 'GRAPH_CIRCULAR', 'MULE_RING', 'CROSS_BORDER_FX'
    )),
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW')),
    jurisdiction VARCHAR(16) NOT NULL DEFAULT 'GLOBAL' CHECK (jurisdiction IN ('GLOBAL', 'NG', 'NE')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    threshold_amount NUMERIC(18, 4),
    time_window_seconds INTEGER NOT NULL DEFAULT 86400,
    rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. AML ALERTS & DEDUPLICATION CLUSTERING
-- ============================================================================

CREATE TABLE IF NOT EXISTS aml_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. ALT-2026-009182
    scenario_id UUID NOT NULL REFERENCES aml_scenarios(id),
    scenario_code VARCHAR(64) NOT NULL,
    scenario_version INTEGER NOT NULL DEFAULT 1,
    
    customer_id UUID NOT NULL,
    account_id UUID,
    transaction_id UUID,
    transaction_reference VARCHAR(64),
    
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW')),
    status VARCHAR(32) NOT NULL DEFAULT 'NEW' CHECK (status IN (
        'NEW', 'QUEUED', 'ASSIGNED', 'IN_REVIEW', 'ESCALATED',
        'FALSE_POSITIVE', 'DISMISSED', 'CONVERTED_TO_CASE', 'CLOSED'
    )),
    
    disputed_or_triggered_amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    -- 7 Mandatory Explainability Dimensions
    what_happened TEXT NOT NULL,
    why_suspicious TEXT NOT NULL,
    who_involved TEXT NOT NULL,
    how_pattern_detected TEXT NOT NULL,
    feature_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    assigned_to VARCHAR(128),
    sla_due_at TIMESTAMPTZ NOT NULL,
    is_sla_breached BOOLEAN DEFAULT FALSE,
    
    case_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. FINANCIAL CRIME CASES & INVESTIGATION WORKBENCH
-- ============================================================================

CREATE TABLE IF NOT EXISTS aml_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. CASE-2026-0081
    title VARCHAR(256) NOT NULL,
    primary_customer_id UUID NOT NULL,
    jurisdiction VARCHAR(2) NOT NULL CHECK (jurisdiction IN ('NG', 'NE')),
    priority VARCHAR(16) NOT NULL CHECK (priority IN ('P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW')),
    
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN (
        'OPEN', 'TRIAGE', 'INVESTIGATION', 'INFORMATION_REQUESTED',
        'ESCALATED', 'DECISION_PENDING', 'ACTION_PENDING', 'CLOSED'
    )),
    
    total_exposure_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL,
    
    lead_investigator VARCHAR(128) NOT NULL,
    assigned_team VARCHAR(64) NOT NULL DEFAULT 'Financial Intelligence Unit',
    
    final_decision VARCHAR(64) CHECK (final_decision IN (
        'NO_CONCERN', 'FALSE_POSITIVE', 'ENHANCED_MONITORING',
        'ACCOUNT_RESTRICTION_EXECUTED', 'STR_SUBMITTED_TO_REGULATOR', 'LAW_ENFORCEMENT_ESCALATION'
    )),
    decision_notes TEXT,
    decision_maker VARCHAR(128),
    decision_checker VARCHAR(128),
    decided_at TIMESTAMPTZ,
    
    sla_due_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS aml_case_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES aml_cases(id) ON DELETE CASCADE,
    author_email VARCHAR(128) NOT NULL,
    note_type VARCHAR(32) NOT NULL DEFAULT 'OBSERVATION',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aml_case_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES aml_cases(id) ON DELETE CASCADE,
    evidence_name VARCHAR(128) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_by VARCHAR(128) NOT NULL,
    chain_of_custody_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. TRANSACTION NETWORK & GRAPH INTELLIGENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS aml_graph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id VARCHAR(128) UNIQUE NOT NULL, -- e.g. CUST-NG-009182, DEV-POS-01
    node_type VARCHAR(32) NOT NULL CHECK (node_type IN (
        'CUSTOMER', 'ACCOUNT', 'BENEFICIARY', 'DEVICE', 'AGENT', 'MERCHANT', 'IP_ADDRESS'
    )),
    label VARCHAR(128) NOT NULL,
    risk_score NUMERIC(5, 2) DEFAULT 10.00,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aml_graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_node_id VARCHAR(128) NOT NULL REFERENCES aml_graph_nodes(node_id) ON DELETE CASCADE,
    target_node_id VARCHAR(128) NOT NULL REFERENCES aml_graph_nodes(node_id) ON DELETE CASCADE,
    edge_type VARCHAR(32) NOT NULL CHECK (edge_type IN (
        'TRANSFERRED_TO', 'SHARED_DEVICE', 'SHARED_PHONE', 'SHARED_BENEFICIARY', 'AGENT_SERVICED'
    )),
    weight NUMERIC(18, 4) DEFAULT 1.0,
    transaction_count INTEGER DEFAULT 1,
    total_volume NUMERIC(18, 4) DEFAULT 0,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_graph_edge UNIQUE (source_node_id, target_node_id, edge_type)
);

-- ============================================================================
-- 6. SOVEREIGN REGULATORY STR / SAR FILING WORK QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS aml_regulatory_str_filings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filing_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. NFIU-STR-2026-0091
    case_id UUID NOT NULL REFERENCES aml_cases(id),
    jurisdiction VARCHAR(2) NOT NULL CHECK (jurisdiction IN ('NG', 'NE')),
    regulator_name VARCHAR(64) NOT NULL, -- 'NFIU (Nigeria)', 'CENTIF (Niger)'
    
    typology_classification VARCHAR(64) NOT NULL,
    reported_volume NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    narrative_summary TEXT NOT NULL,
    
    status VARCHAR(32) NOT NULL DEFAULT 'READY_FOR_APPROVAL' CHECK (status IN (
        'DRAFT', 'READY_FOR_APPROVAL', 'APPROVED_BY_MLRO', 'TRANSMITTED_TO_REGULATOR', 'ACKNOWLEDGED'
    )),
    
    prepared_by VARCHAR(128) NOT NULL,
    mlro_approver VARCHAR(128),
    submission_receipt_hash VARCHAR(128),
    transmitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Ultra-High Performance Real-Time Scenario Triaging
CREATE INDEX IF NOT EXISTS idx_aml_alerts_status_sev ON aml_alerts(status, severity);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_customer ON aml_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_aml_cases_status_prio ON aml_cases(status, priority);
CREATE INDEX IF NOT EXISTS idx_aml_graph_edges_src ON aml_graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_aml_graph_edges_tgt ON aml_graph_edges(target_node_id);
