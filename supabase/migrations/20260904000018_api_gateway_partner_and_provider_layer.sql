-- Migration: 20260904000018_api_gateway_partner_and_provider_layer.sql
-- Description: Production-Grade API Gateway, Partner Registry, Provider Connectivity & Webhook Platform

-- ============================================================================
-- 1. PARTNER REGISTRY & DEVELOPER CLIENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. PRT-NG-0012
    business_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL CHECK (category IN (
        'BANK', 'PAYMENT_PROVIDER', 'FINTECH', 'AGGREGATOR', 'MERCHANT',
        'AGENCY_PARTNER', 'BDC_PARTNER', 'KYC_PROVIDER', 'OTHER'
    )),
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE', 'CROSS_BORDER')),
    legal_entity VARCHAR(128) NOT NULL,
    kyb_status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED' CHECK (kyb_status IN (
        'PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED'
    )),
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (lifecycle_status IN (
        'PROSPECT', 'APPLICATION', 'DUE_DILIGENCE', 'APPROVED', 'SANDBOX', 'PILOT', 'ACTIVE', 'SUSPENDED', 'TERMINATED'
    )),
    tier VARCHAR(32) NOT NULL DEFAULT 'STANDARD' CHECK (tier IN ('STANDARD', 'ENTERPRISE', 'STRATEGIC')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partner_registry(id) ON DELETE CASCADE,
    client_id VARCHAR(64) UNIQUE NOT NULL, -- e.g. cli_live_99182a
    client_name VARCHAR(128) NOT NULL,
    environment VARCHAR(16) NOT NULL DEFAULT 'SANDBOX' CHECK (environment IN ('SANDBOX', 'PRODUCTION')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),
    allowed_scopes TEXT[] NOT NULL DEFAULT ARRAY['payments:read', 'transfers:write']::TEXT[],
    allowed_ips TEXT[] DEFAULT ARRAY[]::TEXT[],
    rate_limit_per_second INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
    key_prefix VARCHAR(16) NOT NULL, -- e.g. kp_live_7f9a...
    secret_hash VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
        'ACTIVE', 'ROTATION_PENDING', 'EXPIRED', 'REVOKED'
    )),
    rotation_expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. IDEMPOTENCY & GATEWAY TELEMETRY
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_idempotency_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_code INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    transaction_reference VARCHAR(64),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_client_idemp UNIQUE (client_id, idempotency_key)
);

-- ============================================================================
-- 3. PROVIDER REGISTRY & CONNECTIVITY HEALTH
-- ============================================================================

CREATE TABLE IF NOT EXISTS provider_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. PROVIDUS_NG, KORIS_NE
    name VARCHAR(128) NOT NULL,
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE', 'GLOBAL')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    adapter_class VARCHAR(128) NOT NULL,
    health_status VARCHAR(32) NOT NULL DEFAULT 'HEALTHY' CHECK (health_status IN (
        'HEALTHY', 'DEGRADED', 'UNSTABLE', 'DOWN', 'MAINTENANCE'
    )),
    circuit_breaker_state VARCHAR(16) NOT NULL DEFAULT 'CLOSED' CHECK (circuit_breaker_state IN (
        'CLOSED', 'OPEN', 'HALF_OPEN'
    )),
    supported_capabilities TEXT[] NOT NULL DEFAULT ARRAY['TRANSFERS', 'STATUS_QUERY', 'WEBHOOKS']::TEXT[],
    avg_latency_ms INTEGER NOT NULL DEFAULT 120,
    success_rate_24h NUMERIC(5, 2) NOT NULL DEFAULT 99.50,
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. OUTBOUND WEBHOOK PLATFORM & DLQ
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    subscribed_events TEXT[] NOT NULL DEFAULT ARRAY['transaction.success', 'transaction.failed', 'transfer.success']::TEXT[],
    signing_secret VARCHAR(128) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
    event_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'DELIVERED' CHECK (status IN (
        'PENDING', 'DELIVERED', 'RETRYING', 'DEAD_LETTERED'
    )),
    response_code INTEGER,
    latency_ms INTEGER DEFAULT 0,
    error_message TEXT,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ultra-High Performance Gateway Indexes
CREATE INDEX IF NOT EXISTS idx_api_idemp_lookup ON api_idempotency_records(client_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_registry_status ON partner_registry(lifecycle_status, country);
