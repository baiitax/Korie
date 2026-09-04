-- Migration: 20260903000010_fraud_risk_treasury_liquidity.sql
-- Description: Comprehensive Fraud/Risk Decisioning and Authoritative Treasury/Liquidity Management for KoriePay (NGN / XOF)

-- 1. RISK ENTITIES & PROFILES
CREATE TABLE IF NOT EXISTS risk_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(32) NOT NULL, -- CUSTOMER, AGENT, MERCHANT, AGGREGATOR, DEVICE, BENEFICIARY, IP_ADDRESS
    entity_reference VARCHAR(128) NOT NULL,
    country_code VARCHAR(2) NOT NULL DEFAULT 'NG',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_risk_entity_ref UNIQUE (entity_type, entity_reference)
);

CREATE TABLE IF NOT EXISTS risk_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES risk_entities(id) ON DELETE CASCADE,
    current_risk_score INT NOT NULL DEFAULT 10 CHECK (current_risk_score BETWEEN 0 AND 100),
    current_risk_band VARCHAR(16) NOT NULL DEFAULT 'LOW', -- VERY_LOW, LOW, MEDIUM, HIGH, VERY_HIGH, CRITICAL
    lifetime_fraud_loss_minor BIGINT NOT NULL DEFAULT 0,
    lifetime_prevented_loss_minor BIGINT NOT NULL DEFAULT 0,
    chargeback_count INT NOT NULL DEFAULT 0,
    reversal_count INT NOT NULL DEFAULT 0,
    alert_count INT NOT NULL DEFAULT 0,
    restriction_status VARCHAR(32) NOT NULL DEFAULT 'UNRESTRICTED', -- UNRESTRICTED, STEP_UP_REQUIRED, UNDER_INVESTIGATION, TEMPORARY_FREEZE, PERMANENT_BLOCK
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. RISK RULES & VERSIONS
CREATE TABLE IF NOT EXISTS risk_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code VARCHAR(64) UNIQUE NOT NULL,
    rule_name VARCHAR(128) NOT NULL,
    scope VARCHAR(32) NOT NULL, -- CUSTOMER, AGENT, MERCHANT, AGGREGATOR, BDC, GLOBAL
    description TEXT,
    severity VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    score_delta INT NOT NULL DEFAULT 10,
    default_action VARCHAR(32) NOT NULL DEFAULT 'ALLOW', -- ALLOW, ALLOW_WITH_STEP_UP, REVIEW, HOLD, DECLINE, BLOCK
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_rule_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES risk_rules(id) ON DELETE CASCADE,
    version INT NOT NULL,
    conditions_json JSONB NOT NULL,
    score_delta INT NOT NULL,
    action VARCHAR(32) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    created_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rule_version UNIQUE (rule_id, version)
);

-- 3. RISK DECISIONS & FACTORS (IMMUTABLE AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS risk_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_reference VARCHAR(128) NOT NULL,
    entity_id UUID NOT NULL REFERENCES risk_entities(id),
    composite_score INT NOT NULL CHECK (composite_score BETWEEN 0 AND 100),
    risk_band VARCHAR(16) NOT NULL, -- VERY_LOW, LOW, MEDIUM, HIGH, VERY_HIGH, CRITICAL
    decision VARCHAR(32) NOT NULL, -- ALLOW, ALLOW_WITH_STEP_UP, REVIEW, HOLD, DECLINE, BLOCK
    decision_reason TEXT,
    policy_version VARCHAR(32) NOT NULL DEFAULT 'v1.0.0',
    model_version VARCHAR(32) NOT NULL DEFAULT 'HEURISTIC-V1',
    execution_latency_ms INT NOT NULL DEFAULT 0,
    rule_hits JSONB NOT NULL DEFAULT '[]'::jsonb,
    signals_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. RISK HOLDS (FINANCIAL LOCKS)
CREATE TABLE IF NOT EXISTS risk_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hold_reference VARCHAR(64) UNIQUE NOT NULL,
    entity_id UUID NOT NULL REFERENCES risk_entities(id),
    transaction_reference VARCHAR(128),
    amount_minor BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    hold_type VARCHAR(32) NOT NULL DEFAULT 'RISK_HOLD', -- RISK_HOLD, COMPLIANCE_HOLD, CHARGEBACK_HOLD, MANUAL_REVIEW_HOLD, LIQUIDITY_HOLD
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, RELEASED, EXPIRED, SEIZED
    reason TEXT NOT NULL,
    created_by VARCHAR(128) NOT NULL,
    released_by VARCHAR(128),
    release_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at TIMESTAMPTZ
);

-- 5. FRAUD CASES & EVENTS
CREATE TABLE IF NOT EXISTS risk_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_reference VARCHAR(64) UNIQUE NOT NULL,
    entity_id UUID NOT NULL REFERENCES risk_entities(id),
    transaction_reference VARCHAR(128),
    risk_score INT NOT NULL,
    risk_band VARCHAR(16) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, INVESTIGATING, WAITING_INFO, ESCALATED, RESOLVED, CONFIRMED_FRAUD, FALSE_POSITIVE, CLOSED
    priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    assigned_desk VARCHAR(64) NOT NULL DEFAULT 'FRAUD_OPS',
    assigned_officer VARCHAR(128),
    sla_due_at TIMESTAMPTZ NOT NULL,
    is_sla_breached BOOLEAN NOT NULL DEFAULT FALSE,
    resolution_notes TEXT,
    resolved_by VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 6. TREASURY ACCOUNTS & POSITIONS
CREATE TABLE IF NOT EXISTS treasury_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code VARCHAR(32) UNIQUE NOT NULL, -- e.g. 1010, 1020, 1030, 2050
    account_name VARCHAR(128) NOT NULL,
    account_type VARCHAR(32) NOT NULL, -- BANK_VAULT, PROVIDER_FLOAT, SETTLEMENT_PAYABLE, RESERVE, SUSPENSE
    bank_or_provider_name VARCHAR(128) NOT NULL,
    country_code VARCHAR(2) NOT NULL DEFAULT 'NG',
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treasury_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    total_liquid_assets_minor BIGINT NOT NULL,
    bank_balances_minor BIGINT NOT NULL,
    provider_balances_minor BIGINT NOT NULL,
    restricted_funds_minor BIGINT NOT NULL,
    committed_settlements_minor BIGINT NOT NULL,
    rolling_reserves_minor BIGINT NOT NULL,
    active_holds_minor BIGINT NOT NULL,
    available_liquidity_minor BIGINT NOT NULL,
    target_buffer_minor BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_treasury_snapshot_currency UNIQUE (snapshot_date, currency)
);

-- 7. TREASURY FUNDING REQUESTS (MAKER-CHECKER REBALANCING)
CREATE TABLE IF NOT EXISTS treasury_funding_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_reference VARCHAR(64) UNIQUE NOT NULL,
    source_account_code VARCHAR(32) NOT NULL REFERENCES treasury_accounts(account_code),
    destination_account_code VARCHAR(32) NOT NULL REFERENCES treasury_accounts(account_code),
    amount_minor BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    purpose VARCHAR(128) NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_APPROVAL', -- PENDING_APPROVAL, APPROVED, REJECTED, EXECUTED, FAILED
    maker_id VARCHAR(128) NOT NULL,
    maker_email VARCHAR(128) NOT NULL,
    checker_id VARCHAR(128),
    checker_email VARCHAR(128),
    journal_entry_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    idempotency_key VARCHAR(128) UNIQUE
);

-- 8. TREASURY FX POSITIONS (NGN vs XOF BOOKS)
CREATE TABLE IF NOT EXISTS treasury_fx_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_pair VARCHAR(8) UNIQUE NOT NULL, -- NGN/XOF, USD/NGN, EUR/XOF
    base_currency VARCHAR(3) NOT NULL,
    quote_currency VARCHAR(3) NOT NULL,
    net_exposure_base_minor BIGINT NOT NULL DEFAULT 0,
    average_acquisition_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.0,
    current_reference_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.0,
    unrealized_pnl_minor BIGINT NOT NULL DEFAULT 0,
    realized_pnl_minor BIGINT NOT NULL DEFAULT 0,
    max_exposure_limit_minor BIGINT NOT NULL DEFAULT 50000000000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. LIQUIDITY STRESS TESTS
CREATE TABLE IF NOT EXISTS liquidity_stress_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_name VARCHAR(128) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    baseline_available_minor BIGINT NOT NULL,
    projected_outflow_surge_minor BIGINT NOT NULL,
    projected_inflow_delay_minor BIGINT NOT NULL,
    simulated_available_minor BIGINT NOT NULL,
    shortfall_amount_minor BIGINT NOT NULL DEFAULT 0,
    time_to_breach_hours INT,
    required_rebalancing_minor BIGINT NOT NULL DEFAULT 0,
    executed_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR LOW-LATENCY DECISIONS & AGGREGATIONS
CREATE INDEX IF NOT EXISTS idx_risk_decisions_created ON risk_decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_cases_status ON risk_cases(status, priority);
CREATE INDEX IF NOT EXISTS idx_risk_holds_status ON risk_holds(status);
CREATE INDEX IF NOT EXISTS idx_treasury_funding_status ON treasury_funding_requests(status);
