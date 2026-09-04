-- Migration: 20260904000024_customer_business_and_ai_decision_intelligence.sql
-- Description: Customer 360, RFM, CLV, Churn, Network Graph, Forecasts, Early Warnings, Decision Intelligence, and AI Governance

CREATE TABLE IF NOT EXISTS customer_360_profiles (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL UNIQUE,
    full_name_masked TEXT NOT NULL,
    jurisdiction TEXT NOT NULL DEFAULT 'NG',
    kyc_tier TEXT NOT NULL DEFAULT 'TIER_2',
    rfm_segment TEXT NOT NULL DEFAULT 'LOYAL_CUSTOMERS',
    recency_score INTEGER NOT NULL DEFAULT 4,
    frequency_score INTEGER NOT NULL DEFAULT 4,
    monetary_score INTEGER NOT NULL DEFAULT 5,
    historical_clv_ngn NUMERIC NOT NULL DEFAULT 0,
    predicted_clv_ngn NUMERIC NOT NULL DEFAULT 0,
    churn_probability NUMERIC NOT NULL DEFAULT 0.12,
    churn_risk_band TEXT NOT NULL DEFAULT 'LOW',
    primary_channel TEXT NOT NULL DEFAULT 'MOBILE_APP',
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_next_best_actions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customer_360_profiles(customer_id),
    recommendation_title TEXT NOT NULL,
    recommendation_type TEXT NOT NULL, -- RETENTION, ACTIVATION, CROSS_SELL, EDUCATION
    reasoning TEXT NOT NULL,
    confidence_score NUMERIC NOT NULL DEFAULT 0.85,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_intelligence_profiles (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL UNIQUE,
    agent_name TEXT NOT NULL,
    location_state TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'NG',
    productivity_score NUMERIC NOT NULL DEFAULT 92.5,
    liquidity_health_score NUMERIC NOT NULL DEFAULT 88.0,
    cash_variance_rate NUMERIC NOT NULL DEFAULT 0.15,
    reversal_rate NUMERIC NOT NULL DEFAULT 0.20,
    performance_tier TEXT NOT NULL DEFAULT 'TOP_PERFORMER',
    stress_probability NUMERIC NOT NULL DEFAULT 0.08,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_intelligence_profiles (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL UNIQUE,
    business_name TEXT NOT NULL,
    monthly_gmv_ngn NUMERIC NOT NULL DEFAULT 0,
    processing_margin_pct NUMERIC NOT NULL DEFAULT 1.5,
    dispute_ratio_pct NUMERIC NOT NULL DEFAULT 0.05,
    growth_trend_pct NUMERIC NOT NULL DEFAULT 12.4,
    status TEXT NOT NULL DEFAULT 'HEALTHY',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS network_graph_nodes (
    id TEXT PRIMARY KEY,
    node_key TEXT NOT NULL UNIQUE,
    node_type TEXT NOT NULL, -- CUSTOMER, AGENT, MERCHANT, PROVIDER, BANK_NODE, TERMINAL
    label TEXT NOT NULL,
    cluster_id TEXT NOT NULL DEFAULT 'CORE_CLUSTER',
    risk_rating TEXT NOT NULL DEFAULT 'LOW',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS network_graph_edges (
    id TEXT PRIMARY KEY,
    source_node_id TEXT NOT NULL REFERENCES network_graph_nodes(id),
    target_node_id TEXT NOT NULL REFERENCES network_graph_nodes(id),
    relationship_type TEXT NOT NULL, -- TRANSACTS_WITH, SETTLES_WITH, USES_DEVICE, REPLENISHES_FLOAT
    weight NUMERIC NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_forecasts (
    id TEXT PRIMARY KEY,
    forecast_code TEXT NOT NULL UNIQUE,
    target_metric TEXT NOT NULL,
    horizon TEXT NOT NULL, -- 7_DAY, 30_DAY, 90_DAY, 12_MONTH
    baseline_value NUMERIC NOT NULL,
    predicted_p50 NUMERIC NOT NULL,
    lower_bound_p10 NUMERIC NOT NULL,
    upper_bound_p90 NUMERIC NOT NULL,
    confidence_score NUMERIC NOT NULL DEFAULT 0.90,
    model_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS early_warning_alerts (
    id TEXT PRIMARY KEY,
    alert_code TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL, -- FINANCIAL, OPERATIONS, LIQUIDITY, AGENT, FRAUD
    title TEXT NOT NULL,
    observed_value NUMERIC NOT NULL,
    expected_value NUMERIC NOT NULL,
    deviation_pct NUMERIC NOT NULL,
    severity TEXT NOT NULL DEFAULT 'MEDIUM', -- INFO, LOW, MEDIUM, HIGH, CRITICAL
    primary_driver TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ACKNOWLEDGED, RESOLVED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decision_recommendations (
    id TEXT PRIMARY KEY,
    decision_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    materiality_tier TEXT NOT NULL DEFAULT 'TIER_2', -- TIER_1_INFO, TIER_2_REC, TIER_3_ACTION, TIER_4_CRITICAL
    observed_telemetry TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    confidence_pct NUMERIC NOT NULL DEFAULT 88.0,
    approver_role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, EXECUTED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_model_registry (
    id TEXT PRIMARY KEY,
    model_code TEXT NOT NULL UNIQUE,
    model_name TEXT NOT NULL,
    domain TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT 'v1.0',
    algorithm TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PRODUCTION', -- DEVELOPMENT, VALIDATION, SHADOW, PRODUCTION, SUSPENDED
    drift_status TEXT NOT NULL DEFAULT 'STABLE', -- STABLE, WARNING, DRIFT_DETECTED
    validation_metric TEXT NOT NULL,
    owner_desk TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_copilot_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    query_text TEXT NOT NULL,
    synthesized_response TEXT NOT NULL,
    evidence_citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    classification_tag TEXT NOT NULL DEFAULT 'CALCULATION', -- FACT, CALCULATION, PREDICTION, INFERENCE, RECOMMENDATION
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_kill_switches (
    id TEXT PRIMARY KEY,
    switch_target TEXT NOT NULL UNIQUE, -- ALL_AI, COPILOT, SCENARIOS, MODEL_CHN, MODEL_FCST
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    activated_by TEXT,
    activated_at TIMESTAMPTZ,
    reason TEXT
);
