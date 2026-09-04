-- Migration: 20260904000019_agency_banking_device_terminal_and_consumer_protection.sql
-- Description: Agency Banking Fleet, Aggregator Management, Device Trust, Terminal Master & Consumer Redress Platform

-- ============================================================================
-- 1. AGGREGATOR & AGENT REGISTRY
-- ============================================================================

CREATE TABLE IF NOT EXISTS aggregators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregator_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. AGG-NG-0012
    business_name VARCHAR(255) NOT NULL,
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE')),
    legal_entity VARCHAR(128) NOT NULL,
    kyb_status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED' CHECK (kyb_status IN ('PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'RESTRICTED', 'TERMINATED')),
    float_account_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. AGT-NG-0092
    aggregator_id UUID REFERENCES aggregators(id) ON DELETE SET NULL,
    legal_name VARCHAR(255) NOT NULL,
    tradingName VARCHAR(255) NOT NULL,
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(255),
    
    region VARCHAR(64) NOT NULL,
    state_or_province VARCHAR(64) NOT NULL,
    lga_or_district VARCHAR(64) NOT NULL,
    
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
        'APPLICATION', 'KYC_PENDING', 'APPROVED', 'ACTIVE', 'RESTRICTED', 'SUSPENDED', 'UNDER_REVIEW', 'TERMINATED'
    )),
    tier VARCHAR(16) NOT NULL DEFAULT 'TIER_1' CHECK (tier IN ('TIER_1', 'TIER_2', 'TIER_3', 'SUPER_AGENT')),
    risk_tier VARCHAR(16) NOT NULL DEFAULT 'LOW' CHECK (risk_tier IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    daily_transaction_limit NUMERIC(18, 4) NOT NULL DEFAULT 1000000,
    single_transaction_limit NUMERIC(18, 4) NOT NULL DEFAULT 100000,
    max_cash_holding NUMERIC(18, 4) NOT NULL DEFAULT 2000000,
    float_balance NUMERIC(18, 4) NOT NULL DEFAULT 0,
    
    active_terminal_id VARCHAR(64),
    assigned_device_id VARCHAR(64),
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    location_type VARCHAR(32) NOT NULL DEFAULT 'FIXED' CHECK (location_type IN ('FIXED', 'MOBILE', 'TEMPORARY')),
    address TEXT NOT NULL,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    geofence_radius_meters INTEGER NOT NULL DEFAULT 500,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. DEVICE TRUST REGISTRY & POS TERMINAL FLEET
-- ============================================================================

CREATE TABLE IF NOT EXISTS agency_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(128) UNIQUE NOT NULL, -- e.g. DEV-POS-NG-01
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    device_type VARCHAR(64) NOT NULL DEFAULT 'ANDROID_POS',
    manufacturer VARCHAR(64) NOT NULL,
    model VARCHAR(64) NOT NULL,
    hardware_fingerprint VARCHAR(128) NOT NULL,
    trust_level VARCHAR(32) NOT NULL DEFAULT 'TRUSTED' CHECK (trust_level IN (
        'UNKNOWN', 'LOW', 'STANDARD', 'TRUSTED', 'HIGH_TRUST', 'RESTRICTED', 'COMPROMISED'
    )),
    is_rooted BOOLEAN NOT NULL DEFAULT FALSE,
    attestation_score NUMERIC(5, 2) NOT NULL DEFAULT 98.00,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_id VARCHAR(64) UNIQUE NOT NULL, -- e.g. TID-NG-009182
    terminal_serial VARCHAR(128) UNIQUE NOT NULL,
    terminal_type VARCHAR(32) NOT NULL DEFAULT 'ANDROID_POS',
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    device_id VARCHAR(128) REFERENCES agency_devices(device_id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
        'INVENTORY', 'ASSIGNED', 'ACTIVE', 'RESTRICTED', 'SUSPENDED', 'MAINTENANCE', 'LOST', 'STOLEN', 'DECOMMISSIONED'
    )),
    capabilities TEXT[] NOT NULL DEFAULT ARRAY['CASH_IN', 'CASH_OUT', 'TRANSFER', 'CARD', 'QR']::TEXT[],
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. PHYSICAL CASH POSITIONS & RECONCILIATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_cash_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    physical_cash_balance NUMERIC(18, 4) NOT NULL DEFAULT 0,
    opening_cash NUMERIC(18, 4) NOT NULL DEFAULT 0,
    cash_inflows NUMERIC(18, 4) NOT NULL DEFAULT 0,
    cash_outflows NUMERIC(18, 4) NOT NULL DEFAULT 0,
    last_counted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_cash_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    reconciliation_date DATE NOT NULL,
    expected_closing_cash NUMERIC(18, 4) NOT NULL,
    counted_physical_cash NUMERIC(18, 4) NOT NULL,
    variance_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'MATCHED' CHECK (status IN (
        'MATCHED', 'SHORT', 'OVER', 'UNDER_REVIEW', 'RESOLVED'
    )),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. CONSUMER COMPLAINTS & REDRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS agency_consumer_complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. CMP-2026-00918
    customer_id UUID NOT NULL,
    customer_name VARCHAR(128) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE')),
    agent_id UUID REFERENCES agents(id),
    terminal_id VARCHAR(64),
    
    category VARCHAR(64) NOT NULL CHECK (category IN (
        'DUPLICATE_DEBIT', 'UNAUTHORIZED_TRANSACTION', 'AGENT_OVERCHARGING',
        'CASH_NOT_DISPENSED', 'FAILED_TRANSACTION', 'OTHER'
    )),
    priority VARCHAR(8) NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
    status VARCHAR(32) NOT NULL DEFAULT 'OPENED' CHECK (status IN (
        'OPENED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'
    )),
    disputed_amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    description TEXT NOT NULL,
    sla_due_at TIMESTAMPTZ NOT NULL,
    gl_journal_id UUID,
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- High-Performance Fleet Indexes
CREATE INDEX IF NOT EXISTS idx_agents_status_country ON agents(status, country);
CREATE INDEX IF NOT EXISTS idx_agency_terminals_status ON agency_terminals(status, agent_id);
CREATE INDEX IF NOT EXISTS idx_agency_complaints_sla ON agency_consumer_complaints(status, priority, sla_due_at);
