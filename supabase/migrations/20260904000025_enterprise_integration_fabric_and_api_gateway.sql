-- Migration: 20260904000025_enterprise_integration_fabric_and_api_gateway.sql
-- Description: API Gateway, Provider Node Adapters, Event Outbox, Webhooks, and Partner 360

CREATE TABLE IF NOT EXISTS api_gateway_routes (
    id TEXT PRIMARY KEY,
    route_code TEXT NOT NULL UNIQUE,
    group_name TEXT NOT NULL,
    http_method TEXT NOT NULL, -- GET, POST, PUT, DELETE
    path_pattern TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT 'v1',
    required_scope TEXT NOT NULL,
    rate_limit_per_second INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_client_credentials (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL,
    client_id TEXT NOT NULL UNIQUE,
    client_name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    hashed_secret TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'SANDBOX', -- SANDBOX, PRODUCTION
    allowed_scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    rate_limit_per_second INTEGER NOT NULL DEFAULT 50,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ROTATION_REQUIRED, REVOKED
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS idempotency_records (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    request_hash_sha256 TEXT NOT NULL,
    response_status INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    resource_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS enterprise_events_outbox (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_version TEXT NOT NULL DEFAULT 'v1',
    aggregate_id TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PUBLISHED, FAILED
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enterprise_event_dead_letters (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES enterprise_events_outbox(id),
    consumer_name TEXT NOT NULL,
    failure_reason TEXT NOT NULL,
    attempts_count INTEGER NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'DEAD_LETTERED', -- DEAD_LETTERED, REPLAYED, DISMISSED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    target_url TEXT NOT NULL,
    subscribed_events JSONB NOT NULL DEFAULT '[]'::jsonb,
    signing_secret_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_delivery_attempts (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL REFERENCES webhook_subscriptions(id),
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    target_url TEXT NOT NULL,
    http_status INTEGER,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'DELIVERED', -- DELIVERED, RETRYING, DEAD_LETTERED
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_node_adapters (
    id TEXT PRIMARY KEY,
    provider_code TEXT NOT NULL UNIQUE,
    provider_name TEXT NOT NULL,
    provider_type TEXT NOT NULL, -- COMMERCIAL_BANK, SWITCH, CIT_COURIER, FX_DESK
    country TEXT NOT NULL DEFAULT 'NG',
    circuit_breaker_status TEXT NOT NULL DEFAULT 'CLOSED', -- CLOSED, OPEN, HALF_OPEN
    p95_latency_ms INTEGER NOT NULL DEFAULT 150,
    success_rate_pct NUMERIC NOT NULL DEFAULT 99.8,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_360_profiles (
    id TEXT PRIMARY KEY,
    partner_code TEXT NOT NULL UNIQUE,
    business_name TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'NG',
    kyb_status TEXT NOT NULL DEFAULT 'VERIFIED', -- PENDING, VERIFIED, REJECTED
    risk_tier TEXT NOT NULL DEFAULT 'LOW', -- LOW, MEDIUM, HIGH
    daily_settlement_limit_ngn NUMERIC NOT NULL DEFAULT 50000000,
    is_open_banking_ais BOOLEAN NOT NULL DEFAULT FALSE,
    is_open_banking_pis BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_threat_events (
    id TEXT PRIMARY KEY,
    threat_type TEXT NOT NULL, -- BRUTE_FORCE, IDOR_PROBE, ABNORMAL_BURST, MALFORMED_SIGNATURE
    source_ip TEXT NOT NULL,
    client_id TEXT,
    severity TEXT NOT NULL DEFAULT 'HIGH', -- LOW, MEDIUM, HIGH, CRITICAL
    action_taken TEXT NOT NULL DEFAULT 'BLOCKED_403',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
