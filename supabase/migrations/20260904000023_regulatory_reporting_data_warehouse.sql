-- Migration: 20260904000023_regulatory_reporting_data_warehouse.sql
-- Description: Enterprise Regulatory Reporting, Data Warehouse, Lineage, Data Quality, and MI Control Plane

CREATE TABLE IF NOT EXISTS data_sources (
    id TEXT PRIMARY KEY,
    source_code TEXT NOT NULL UNIQUE,
    source_name TEXT NOT NULL,
    domain TEXT NOT NULL,
    system_type TEXT NOT NULL, -- OLTP, SWITCH, LEDGER, AML, FRAUD
    connection_status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_ingestion_batches (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES data_sources(id),
    batch_reference TEXT NOT NULL UNIQUE,
    records_count INTEGER NOT NULL DEFAULT 0,
    payload_hash_sha256 TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED', -- INGESTED, STANDARDIZED, FAILED
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_dictionary_entries (
    id TEXT PRIMARY KEY,
    metric_code TEXT NOT NULL UNIQUE,
    metric_name TEXT NOT NULL,
    domain TEXT NOT NULL,
    business_definition TEXT NOT NULL,
    technical_formula TEXT NOT NULL,
    data_owner TEXT NOT NULL,
    data_steward TEXT NOT NULL,
    confidentiality_level TEXT NOT NULL DEFAULT 'INTERNAL',
    version TEXT NOT NULL DEFAULT 'v1.0',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_quality_rules (
    id TEXT PRIMARY KEY,
    rule_code TEXT NOT NULL UNIQUE,
    rule_name TEXT NOT NULL,
    dimension TEXT NOT NULL, -- COMPLETENESS, ACCURACY, TIMELINESS, CONSISTENCY, UNIQUENESS, VALIDITY, REFERENTIAL, RECONCILIATION
    target_dataset TEXT NOT NULL,
    weight_pct NUMERIC NOT NULL DEFAULT 10,
    is_blocking BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_quality_runs (
    id TEXT PRIMARY KEY,
    dataset_name TEXT NOT NULL,
    overall_score NUMERIC NOT NULL,
    readiness_gate TEXT NOT NULL, -- DATA_READY, DATA_READY_WITH_WARNINGS, DATA_NOT_READY, DATA_BLOCKED
    completeness_score NUMERIC NOT NULL,
    accuracy_score NUMERIC NOT NULL,
    reconciliation_score NUMERIC NOT NULL,
    consistency_score NUMERIC NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_lineage_nodes (
    id TEXT PRIMARY KEY,
    node_code TEXT NOT NULL UNIQUE,
    node_name TEXT NOT NULL,
    node_type TEXT NOT NULL, -- REPORT_CELL, METRIC, DATASET, MART_TABLE, WAREHOUSE_FACT, LEDGER_ACCOUNT, TRANSACTION
    source_system TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS data_lineage_edges (
    id TEXT PRIMARY KEY,
    source_node_id TEXT NOT NULL REFERENCES data_lineage_nodes(id),
    target_node_id TEXT NOT NULL REFERENCES data_lineage_nodes(id),
    transformation_type TEXT NOT NULL, -- DIRECT, AGGREGATION, FILTER, JOIN
    transformation_rule TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regulatory_obligations (
    id TEXT PRIMARY KEY,
    obligation_code TEXT NOT NULL UNIQUE,
    regulator TEXT NOT NULL, -- CBN, NFIU, NDIC, BCEAO, CENTIF
    jurisdiction TEXT NOT NULL, -- NG, NE
    report_title TEXT NOT NULL,
    frequency TEXT NOT NULL, -- DAILY, MONTHLY, QUARTERLY, ANNUAL, AD_HOC
    submission_channel TEXT NOT NULL, -- API, SFTP, SECURE_FILE, PORTAL
    report_owner TEXT NOT NULL,
    approver_role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regulatory_report_definitions (
    id TEXT PRIMARY KEY,
    obligation_id TEXT NOT NULL REFERENCES regulatory_obligations(id),
    definition_code TEXT NOT NULL UNIQUE,
    version TEXT NOT NULL DEFAULT 'v1.0',
    template_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regulatory_report_snapshots (
    id TEXT PRIMARY KEY,
    obligation_id TEXT NOT NULL REFERENCES regulatory_obligations(id),
    definition_id TEXT NOT NULL REFERENCES regulatory_report_definitions(id),
    period_code TEXT NOT NULL, -- e.g. 2026-M08, 2026-Q3
    snapshot_hash_sha256 TEXT NOT NULL,
    report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    reconciliation_status TEXT NOT NULL DEFAULT 'BALANCED',
    maker_preparer_id TEXT NOT NULL,
    checker_approver_id TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, PREPARED, APPROVED, SUBMITTED, ACKNOWLEDGED, RESTATED
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regulatory_submissions (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL REFERENCES regulatory_report_snapshots(id),
    idempotency_key TEXT NOT NULL UNIQUE,
    submission_channel TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    submission_ref TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'SUBMITTED', -- PENDING, SUBMITTED, ACKNOWLEDGED, REJECTED
    acknowledgement_token TEXT,
    acknowledged_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regulatory_restatements (
    id TEXT PRIMARY KEY,
    original_snapshot_id TEXT NOT NULL REFERENCES regulatory_report_snapshots(id),
    amended_snapshot_id TEXT NOT NULL REFERENCES regulatory_report_snapshots(id),
    restatement_reason TEXT NOT NULL,
    delta_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    approved_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS management_kpis (
    id TEXT PRIMARY KEY,
    kpi_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    domain TEXT NOT NULL, -- FINANCIAL, PAYMENTS, OPERATIONS, RISK, TREASURY, AML
    formula TEXT NOT NULL,
    unit TEXT NOT NULL,
    target_value NUMERIC NOT NULL,
    actual_value NUMERIC NOT NULL,
    budget_value NUMERIC NOT NULL,
    variance_pct NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'ON_TRACK',
    currency TEXT NOT NULL DEFAULT 'NGN',
    owner_role TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_reports (
    id TEXT PRIMARY KEY,
    report_code TEXT NOT NULL UNIQUE,
    meeting_period TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PUBLISHED',
    generated_by TEXT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_report_actions (
    id TEXT PRIMARY KEY,
    board_report_id TEXT NOT NULL REFERENCES board_reports(id),
    directive_title TEXT NOT NULL,
    assigned_owner TEXT NOT NULL,
    due_date DATE NOT NULL,
    priority TEXT NOT NULL DEFAULT 'HIGH',
    status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, COMPLETED
    evidence_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reporting_adjustments (
    id TEXT PRIMARY KEY,
    metric_code TEXT NOT NULL,
    period_code TEXT NOT NULL,
    previous_value NUMERIC NOT NULL,
    adjusted_value NUMERIC NOT NULL,
    adjustment_reason TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    approved_by TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_exports (
    id TEXT PRIMARY KEY,
    dataset_name TEXT NOT NULL,
    export_format TEXT NOT NULL, -- PDF, CSV, XLSX, JSON
    requested_by TEXT NOT NULL,
    purpose TEXT NOT NULL,
    risk_assessment TEXT NOT NULL DEFAULT 'PASSED_PII_MASKED',
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    download_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
