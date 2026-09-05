-- ==============================================================================
-- KORIEPAY TIER-1 FINANCIAL PLATFORM: PROVIDER NODES, WEBHOOKS & OUTBOX
-- Migration: 20260903000005_providers_webhooks_outbox.sql
-- ==============================================================================

-- 1. Banking Nodes & External Payment Switches
CREATE TABLE IF NOT EXISTS public.provider_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(16) NOT NULL CHECK (country IN ('NG', 'NE', 'CROSS_BORDER')),
    status VARCHAR(32) NOT NULL DEFAULT 'CONNECTED' CHECK (status IN ('CONNECTED', 'DEGRADED', 'OFFLINE', 'MAINTENANCE')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    base_url VARCHAR(255) NOT NULL,
    health_check_url VARCHAR(255) NOT NULL,
    latency_ms INT NOT NULL DEFAULT 120,
    success_rate_24h NUMERIC(5, 2) NOT NULL DEFAULT 99.90,
    last_ping_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    circuit_breaker_state VARCHAR(16) NOT NULL DEFAULT 'CLOSED' CHECK (circuit_breaker_state IN ('CLOSED', 'HALF_OPEN', 'OPEN')),
    consecutive_failures INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Authoritative Banking Nodes
INSERT INTO public.provider_nodes (code, name, country, status, base_url, health_check_url, latency_ms, success_rate_24h)
VALUES
  ('PROVIDUS_NG', 'Providus Bank Nigeria NIP Banking Node', 'NG', 'CONNECTED', 'https://api.providusbank.com/v2', '/health', 142, 99.94),
  ('KORIS_NE', 'Coris Bank Niger Republic WAEMU Core Node', 'NE', 'CONNECTED', 'https://api.korisbank.ne/v1', '/status', 188, 99.88),
  ('NIBSS_NIP', 'NIBSS Instant Payment Switch (Nigeria)', 'NG', 'CONNECTED', 'https://nip.nibss-plc.com.ng', '/heartbeat', 210, 99.82),
  ('GIM_UEMOA', 'GIM-UEMOA Interbank Settlement Switch', 'NE', 'CONNECTED', 'https://switch.gim-uemoa.org', '/ping', 240, 99.75)
ON CONFLICT (code) DO NOTHING;

-- 2. Webhook Endpoints & Event Subscriptions
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    url VARCHAR(512) NOT NULL,
    environment VARCHAR(16) NOT NULL DEFAULT 'SANDBOX' CHECK (environment IN ('SANDBOX', 'PRODUCTION')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED', 'FAILING')),
    events TEXT[] NOT NULL,
    signing_secret_hash VARCHAR(128) NOT NULL,
    signing_secret_masked VARCHAR(64) NOT NULL,
    failure_count INT NOT NULL DEFAULT 0,
    last_delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_org ON public.webhook_endpoints(org_id);

-- 3. Webhook Delivery Logs
CREATE TABLE IF NOT EXISTS public.webhook_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
    event_name VARCHAR(128) NOT NULL,
    endpoint_url VARCHAR(512) NOT NULL,
    environment VARCHAR(16) NOT NULL,
    attempt_number INT NOT NULL DEFAULT 1,
    max_attempts INT NOT NULL DEFAULT 5,
    http_status INT NOT NULL,
    latency_ms INT NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('DELIVERED', 'FAILED', 'RETRYING', 'REPLAYED')),
    payload JSONB NOT NULL,
    response_body TEXT,
    signature_header VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_whk ON public.webhook_delivery_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON public.webhook_delivery_logs(event_name);

-- 4. Outbox Events (Guaranteed At-Least-Once Delivery Engine)
CREATE TABLE IF NOT EXISTS public.outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_name VARCHAR(128) NOT NULL,
    aggregate_type VARCHAR(64) NOT NULL CHECK (aggregate_type IN ('TRANSACTION', 'LEDGER', 'CUSTOMER', 'WALLET', 'WEBHOOK')),
    aggregate_id VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER')),
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 10,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_status_created ON public.outbox_events(status, created_at);
