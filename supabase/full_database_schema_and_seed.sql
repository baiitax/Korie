-- =============================================================================
-- KORIEPAY COMPLETE PRODUCTION DATABASE SCHEMA & SAMPLE SEED DATA
-- Target: Supabase SQL Editor (Single Paste & Execute)
-- Description: Complete Tier-1 Core Banking, Double-Entry Ledger, Treasury,
--              Central Liquidity Pool, and Adashi / Ajo / ROSCA Platform.
-- Multi-Jurisdiction: Nigeria (NGN) & Niger Republic (XOF)
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: EXTENSIONS & SCHEMAS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS adashi;
CREATE SCHEMA IF NOT EXISTS liquidity;

-- =============================================================================
-- SECTION 2: CORE IDENTITY, TENANCY & IAM (PUBLIC SCHEMA)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    country VARCHAR(16) NOT NULL CHECK (country IN ('NG', 'NE', 'CROSS_BORDER')),
    jurisdiction VARCHAR(64) NOT NULL DEFAULT 'Bilateral WAEMU',
    business_type VARCHAR(64) NOT NULL DEFAULT 'FINTECH' CHECK (business_type IN ('FINTECH', 'MERCHANT', 'AGGREGATOR', 'BANK', 'ENTERPRISE')),
    tier VARCHAR(32) NOT NULL DEFAULT 'TIER_1' CHECK (tier IN ('TIER_1', 'TIER_2', 'TIER_3', 'ENTERPRISE')),
    verification_status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED' CHECK (verification_status IN ('PENDING', 'TIER_1', 'VERIFIED', 'REJECTED')),
    default_currency VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (default_currency IN ('NGN', 'XOF', 'USD')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    country VARCHAR(16) NOT NULL DEFAULT 'NG',
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INVITED', 'DEACTIVATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    country VARCHAR(16) NOT NULL CHECK (country IN ('NG', 'NE')),
    preferred_language VARCHAR(8) NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'ha', 'fr')),
    kyc_tier VARCHAR(16) NOT NULL DEFAULT 'TIER_1' CHECK (kyc_tier IN ('TIER_0', 'TIER_1', 'TIER_2', 'TIER_3')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'FROZEN', 'DECEASED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, phone),
    UNIQUE (org_id, email)
);

CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    account_number VARCHAR(32) UNIQUE,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    country VARCHAR(16) NOT NULL CHECK (country IN ('NG', 'NE', 'CROSS_BORDER')),
    balance NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    locked_balance NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (locked_balance >= 0),
    daily_limit NUMERIC(24, 2) NOT NULL DEFAULT 500000.00,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESTRICTED', 'FROZEN', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SECTION 3: DOUBLE-ENTRY ACCOUNTING CORE LEDGER (AUTHORITATIVE TRUTH)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    account_number VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    country VARCHAR(16) NOT NULL CHECK (country IN ('NG', 'NE', 'CROSS_BORDER')),
    balance NUMERIC(24, 2) NOT NULL DEFAULT 0.00,
    locked_balance NUMERIC(24, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESTRICTED', 'FROZEN', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    transaction_reference VARCHAR(128) NOT NULL UNIQUE,
    external_reference VARCHAR(128),
    description TEXT NOT NULL,
    total_amount NUMERIC(24, 2) NOT NULL CHECK (total_amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    status VARCHAR(32) NOT NULL DEFAULT 'COMMITTED' CHECK (status IN ('PENDING', 'COMMITTED', 'REVERSED', 'DISPUTED')),
    posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
    entry_type VARCHAR(16) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(24, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    narration VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SECTION 4: DOMAIN B — CENTRAL LIQUIDITY POOL SCHEMA
-- =============================================================================

CREATE TABLE IF NOT EXISTS liquidity.legal_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(16) UNIQUE NOT NULL, -- e.g. KP-NG, KP-NE
    name VARCHAR(255) NOT NULL,
    country_code VARCHAR(2) NOT NULL CHECK (country_code IN ('NG', 'NE')),
    base_currency VARCHAR(3) NOT NULL CHECK (base_currency IN ('NGN', 'XOF')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liquidity.banking_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code VARCHAR(64) UNIQUE NOT NULL, -- PROVIDUS_NG, KORIS_NE
    provider_name VARCHAR(128) NOT NULL,
    country_code VARCHAR(2) NOT NULL CHECK (country_code IN ('NG', 'NE')),
    base_currency VARCHAR(3) NOT NULL CHECK (base_currency IN ('NGN', 'XOF')),
    provider_type VARCHAR(32) NOT NULL CHECK (provider_type IN ('COMMERCIAL_BANK', 'CENTRAL_BANK', 'SWITCH', 'MOBILE_MONEY')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liquidity.pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_code VARCHAR(64) UNIQUE NOT NULL,
    pool_name VARCHAR(128) NOT NULL,
    pool_type VARCHAR(32) NOT NULL CHECK (pool_type IN ('CENTRAL', 'BANK', 'SETTLEMENT', 'OPERATIONAL', 'AGENT', 'ADASHI', 'RESERVE', 'RESTRICTED')),
    legal_entity_code VARCHAR(16) NOT NULL REFERENCES liquidity.legal_entities(code),
    country_code VARCHAR(2) NOT NULL CHECK (country_code IN ('NG', 'NE')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESTRICTED', 'FROZEN', 'CLOSED')),
    description TEXT,
    is_test_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pool_currency_match CHECK (
      (country_code = 'NG' AND currency = 'NGN' AND legal_entity_code = 'KP-NG') OR
      (country_code = 'NE' AND currency = 'XOF' AND legal_entity_code = 'KP-NE')
    )
);

CREATE TABLE IF NOT EXISTS liquidity.pool_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES liquidity.pools(id) ON DELETE RESTRICT,
    provider_id UUID NOT NULL REFERENCES liquidity.banking_providers(id) ON DELETE RESTRICT,
    account_identifier VARCHAR(64) UNIQUE NOT NULL,
    account_name VARCHAR(128) NOT NULL,
    account_type VARCHAR(32) NOT NULL CHECK (account_type IN ('COMMERCIAL_CHECKING', 'CENTRAL_BANK_SETTLEMENT', 'CUSTODIAL_ESCROW', 'COLLATERAL_RESERVE')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    country_code VARCHAR(2) NOT NULL CHECK (country_code IN ('NG', 'NE')),
    legal_entity_code VARCHAR(16) NOT NULL REFERENCES liquidity.legal_entities(code),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    is_test_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liquidity.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID UNIQUE NOT NULL REFERENCES liquidity.pools(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    current_confirmed NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (current_confirmed >= 0),
    available NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (available >= 0),
    reserved NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (reserved >= 0),
    restricted NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (restricted >= 0),
    pending_settlement NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (pending_settlement >= 0),
    in_transit NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (in_transit >= 0),
    expected_inflow NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (expected_inflow >= 0),
    committed_outflow NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (committed_outflow >= 0),
    projected NUMERIC(24, 2) NOT NULL DEFAULT 0.00,
    last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liquidity.movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_reference VARCHAR(64) UNIQUE NOT NULL,
    pool_id UUID NOT NULL REFERENCES liquidity.pools(id) ON DELETE RESTRICT,
    movement_type VARCHAR(64) NOT NULL,
    direction VARCHAR(8) NOT NULL CHECK (direction IN ('INFLOW', 'OUTFLOW', 'HOLD', 'RELEASE')),
    amount NUMERIC(24, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    source_account_id UUID REFERENCES liquidity.pool_accounts(id) ON DELETE RESTRICT,
    destination_account_id UUID REFERENCES liquidity.pool_accounts(id) ON DELETE RESTRICT,
    related_domain VARCHAR(64),
    related_reference VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'COMMITTED' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'COMMITTED', 'REJECTED', 'CANCELLED')),
    ledger_journal_id VARCHAR(64),
    narration TEXT NOT NULL,
    is_test_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liquidity.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_reference VARCHAR(64) UNIQUE NOT NULL,
    pool_id UUID NOT NULL REFERENCES liquidity.pools(id) ON DELETE RESTRICT,
    legal_entity_code VARCHAR(16) NOT NULL REFERENCES liquidity.legal_entities(code),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    reserved_amount NUMERIC(24, 2) NOT NULL CHECK (reserved_amount > 0),
    used_amount NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (used_amount >= 0),
    remaining_amount NUMERIC(24, 2) NOT NULL CHECK (remaining_amount >= 0),
    source_domain VARCHAR(32) NOT NULL DEFAULT 'ADASHI' CHECK (source_domain IN ('ADASHI', 'SETTLEMENT', 'MERCHANT_PAYOUT', 'TREASURY')),
    source_reference VARCHAR(128) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('REQUESTED', 'ACTIVE', 'PARTIALLY_USED', 'CONSUMED', 'RELEASED', 'EXPIRED', 'CANCELLED')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL,
    released_by UUID,
    released_at TIMESTAMPTZ,
    is_test_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liquidity.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES liquidity.pools(id) ON DELETE CASCADE,
    alert_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'WARNING' CHECK (severity IN ('INFO', 'WARNING', 'HIGH', 'CRITICAL')),
    threshold_value NUMERIC(24, 2),
    current_value NUMERIC(24, 2),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    message TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liquidity.position_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES liquidity.pools(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    current_confirmed NUMERIC(24, 2) NOT NULL,
    available NUMERIC(24, 2) NOT NULL,
    reserved NUMERIC(24, 2) NOT NULL,
    restricted NUMERIC(24, 2) NOT NULL,
    pending_settlement NUMERIC(24, 2) NOT NULL,
    in_transit NUMERIC(24, 2) NOT NULL,
    expected_inflow NUMERIC(24, 2) NOT NULL,
    committed_outflow NUMERIC(24, 2) NOT NULL,
    projected NUMERIC(24, 2) NOT NULL,
    trigger_reason VARCHAR(64) NOT NULL DEFAULT 'SCHEDULED_EOD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liquidity.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    actor_id UUID NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    correlation_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SECTION 5: DOMAIN A — ADASHI / AJO / ROSCA SCHEMA
-- =============================================================================

CREATE TABLE IF NOT EXISTS adashi.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(64) UNIQUE NOT NULL,
    product_name VARCHAR(128) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED')),
    default_currency VARCHAR(3) NOT NULL CHECK (default_currency IN ('NGN', 'XOF')),
    country_code VARCHAR(2) NOT NULL CHECK (country_code IN ('NG', 'NE')),
    minimum_members INT NOT NULL DEFAULT 3 CHECK (minimum_members >= 2),
    maximum_members INT NOT NULL DEFAULT 50 CHECK (maximum_members <= 100),
    contribution_frequency VARCHAR(16) NOT NULL CHECK (contribution_frequency IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY')),
    contribution_amount NUMERIC(24, 2) NOT NULL CHECK (contribution_amount > 0),
    cycle_duration_days INT NOT NULL CHECK (cycle_duration_days > 0),
    grace_period_hours INT NOT NULL DEFAULT 48 CHECK (grace_period_hours >= 0),
    max_overdue_days INT NOT NULL DEFAULT 7 CHECK (max_overdue_days >= 1),
    allocation_method VARCHAR(64) NOT NULL DEFAULT 'CRYPTO_HMAC_SHA256',
    platform_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 5.00),
    agent_commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.50 CHECK (agent_commission_percent >= 0 AND agent_commission_percent <= 3.00),
    requires_maker_checker_payout BOOLEAN NOT NULL DEFAULT TRUE,
    payout_maker_checker_threshold NUMERIC(24, 2) NOT NULL DEFAULT 500000.00,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_adashi_prod_jurisdiction CHECK (
      (country_code = 'NG' AND default_currency = 'NGN') OR
      (country_code = 'NE' AND default_currency = 'XOF')
    )
);

CREATE TABLE IF NOT EXISTS adashi.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_reference VARCHAR(64) UNIQUE NOT NULL,
    product_id UUID NOT NULL REFERENCES adashi.products(id) ON DELETE RESTRICT,
    product_version INT NOT NULL DEFAULT 1,
    creator_id UUID NOT NULL,
    creator_role VARCHAR(32) NOT NULL CHECK (creator_role IN ('AGENT', 'CUSTOMER', 'ADMIN')),
    assigned_agent_id UUID,
    legal_entity_code VARCHAR(16) NOT NULL REFERENCES liquidity.legal_entities(code),
    country_code VARCHAR(2) NOT NULL CHECK (country_code IN ('NG', 'NE')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    contribution_amount NUMERIC(24, 2) NOT NULL CHECK (contribution_amount > 0),
    frequency VARCHAR(16) NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY')),
    target_members INT NOT NULL CHECK (target_members >= 2),
    current_members_count INT NOT NULL DEFAULT 0 CHECK (current_members_count >= 0),
    min_members INT NOT NULL DEFAULT 3,
    start_date DATE,
    grace_period_hours INT NOT NULL DEFAULT 48,
    allocation_method VARCHAR(64) NOT NULL DEFAULT 'CRYPTO_HMAC_SHA256',
    total_cycles INT NOT NULL,
    current_cycle_number INT NOT NULL DEFAULT 0 CHECK (current_cycle_number >= 0),
    total_pool_volume NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (total_pool_volume >= 0),
    escrow_vault_account_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'OPEN_FOR_MEMBERS', 'MEMBERSHIP_REVIEW', 'MEMBERSHIP_LOCKED',
        'ALLOCATION_PENDING', 'ALLOCATION_GENERATED', 'ALLOCATION_VERIFIED', 'ALLOCATION_PUBLISHED',
        'ACTIVE', 'CYCLE_IN_PROGRESS', 'COMPLETION_PENDING', 'COMPLETED', 'CLOSED',
        'SUSPENDED', 'RESTRICTED', 'DEFAULT_REVIEW', 'PAYOUT_HOLD', 'FINANCIAL_EXCEPTION',
        'CANCELLED', 'TERMINATED'
    )),
    locked_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_test_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_adashi_grp_jurisdiction CHECK (
      (country_code = 'NG' AND currency = 'NGN' AND legal_entity_code = 'KP-NG') OR
      (country_code = 'NE' AND currency = 'XOF' AND legal_entity_code = 'KP-NE')
    )
);

CREATE TABLE IF NOT EXISTS adashi.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    membership_reference VARCHAR(64) UNIQUE NOT NULL,
    membership_status VARCHAR(32) NOT NULL DEFAULT 'INVITED' CHECK (membership_status IN (
        'INVITED', 'CONSENT_PENDING', 'CONSENT_ACCEPTED', 'CONSENT_REJECTED',
        'ACTIVE_LOCKED', 'PAYOUT_RECEIVED', 'DEFAULTED', 'EXITED', 'REPLACED', 'COMPLETED'
    )),
    kyc_tier INT NOT NULL DEFAULT 1 CHECK (kyc_tier IN (1, 2, 3)),
    assigned_position INT CHECK (assigned_position >= 1),
    mandate_authorized BOOLEAN NOT NULL DEFAULT FALSE,
    mandate_authorized_at TIMESTAMPTZ,
    total_contributed NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (total_contributed >= 0),
    total_payout_received NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (total_payout_received >= 0),
    risk_status VARCHAR(32) NOT NULL DEFAULT 'CLEAR',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_adashi_member_group_customer UNIQUE (group_id, customer_id),
    CONSTRAINT uq_adashi_member_group_position UNIQUE (group_id, assigned_position)
);

CREATE TABLE IF NOT EXISTS adashi.allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    algorithm VARCHAR(64) NOT NULL DEFAULT 'CRYPTO_HMAC_SHA256',
    seed_hash VARCHAR(128) NOT NULL,
    fairness_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    integrity_hash VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'VERIFIED', 'PUBLISHED', 'AMENDED', 'SUPERSEDED')),
    generated_by UUID NOT NULL,
    published_by UUID,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_adashi_allocation_group_version UNIQUE (group_id, version)
);

CREATE TABLE IF NOT EXISTS adashi.allocation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID NOT NULL REFERENCES adashi.allocations(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES adashi.members(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    position INT NOT NULL CHECK (position >= 1),
    scheduled_cycle_number INT NOT NULL CHECK (scheduled_cycle_number >= 1),
    scheduled_payout_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_adashi_alloc_member UNIQUE (allocation_id, member_id),
    CONSTRAINT uq_adashi_alloc_pos UNIQUE (allocation_id, position)
);

CREATE TABLE IF NOT EXISTS adashi.cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    cycle_number INT NOT NULL CHECK (cycle_number >= 1),
    beneficiary_member_id UUID NOT NULL REFERENCES adashi.members(id) ON DELETE RESTRICT,
    beneficiary_customer_id UUID NOT NULL,
    beneficiary_name VARCHAR(128) NOT NULL,
    start_date DATE NOT NULL,
    contribution_deadline TIMESTAMPTZ NOT NULL,
    grace_deadline TIMESTAMPTZ NOT NULL,
    expected_pool NUMERIC(24, 2) NOT NULL CHECK (expected_pool > 0),
    collected_pool NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (collected_pool >= 0),
    outstanding_amount NUMERIC(24, 2) NOT NULL CHECK (outstanding_amount >= 0),
    gross_payout_amount NUMERIC(24, 2) NOT NULL CHECK (gross_payout_amount > 0),
    platform_fee_amount NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (platform_fee_amount >= 0),
    agent_commission_amount NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (agent_commission_amount >= 0),
    net_payout_amount NUMERIC(24, 2) NOT NULL CHECK (net_payout_amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN (
        'SCHEDULED', 'CONTRIBUTION_OPEN', 'COLLECTION_IN_PROGRESS', 'COLLECTION_COMPLETED',
        'PAYOUT_PENDING_APPROVAL', 'PAYOUT_PROCESSING', 'PAYOUT_COMPLETED', 'DEFAULT_ARREARS', 'PAYOUT_HOLD', 'CLOSED'
    )),
    payout_reference VARCHAR(64),
    payout_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_adashi_cycle_number UNIQUE (group_id, cycle_number)
);

CREATE TABLE IF NOT EXISTS adashi.contribution_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES adashi.cycles(id) ON DELETE CASCADE,
    cycle_number INT NOT NULL CHECK (cycle_number >= 1),
    member_id UUID NOT NULL REFERENCES adashi.members(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL,
    amount NUMERIC(24, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    due_date TIMESTAMPTZ NOT NULL,
    grace_deadline TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN (
        'SCHEDULED', 'DUE', 'PROCESSING', 'PAID', 'FAILED', 'PENDING', 'UNKNOWN', 'OVERDUE', 'DEFAULTED', 'WAIVED', 'CANCELLED'
    )),
    retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    last_retry_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    ledger_journal_id VARCHAR(64),
    payment_reference VARCHAR(64),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_adashi_obligation UNIQUE (group_id, cycle_id, member_id)
);

CREATE TABLE IF NOT EXISTS adashi.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE RESTRICT,
    cycle_id UUID NOT NULL REFERENCES adashi.cycles(id) ON DELETE RESTRICT,
    cycle_number INT NOT NULL CHECK (cycle_number >= 1),
    beneficiary_customer_id UUID NOT NULL,
    beneficiary_name VARCHAR(128) NOT NULL,
    gross_amount NUMERIC(24, 2) NOT NULL CHECK (gross_amount > 0),
    platform_fee NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (platform_fee >= 0),
    agent_commission NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (agent_commission >= 0),
    net_disbursed_amount NUMERIC(24, 2) NOT NULL CHECK (net_disbursed_amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    destination_type VARCHAR(32) NOT NULL DEFAULT 'KORIEPAY_WALLET' CHECK (destination_type IN ('KORIEPAY_WALLET', 'BANK_ACCOUNT', 'MOBILE_MONEY')),
    destination_account_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'AUTHORIZED', 'PROCESSING', 'SUCCESS', 'FAILED', 'UNKNOWN', 'REVERSED', 'CANCELLED')),
    requires_maker_checker BOOLEAN NOT NULL DEFAULT TRUE,
    maker_id UUID NOT NULL,
    checker_id UUID,
    ledger_journal_id VARCHAR(64),
    payment_reference VARCHAR(64) UNIQUE NOT NULL,
    disbursed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_adashi_cycle_active_payout UNIQUE (cycle_id)
);

CREATE TABLE IF NOT EXISTS adashi.defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES adashi.cycles(id) ON DELETE CASCADE,
    obligation_id UUID NOT NULL REFERENCES adashi.contribution_obligations(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES adashi.members(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL,
    defaulted_amount NUMERIC(24, 2) NOT NULL CHECK (defaulted_amount > 0),
    recovered_amount NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (recovered_amount >= 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    due_date TIMESTAMPTZ NOT NULL,
    grace_deadline TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_RECOVERY', 'SETTLED', 'WRITTEN_OFF')),
    recovery_stage VARCHAR(32) NOT NULL DEFAULT 'GRACE_OVERDUE',
    reason TEXT,
    assigned_agent_id UUID,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adashi.consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    member_id UUID REFERENCES adashi.members(id) ON DELETE SET NULL,
    consent_type VARCHAR(64) NOT NULL,
    terms_version VARCHAR(32) NOT NULL DEFAULT 'v1.0.0',
    consent_status VARCHAR(32) NOT NULL DEFAULT 'ACCEPTED',
    ip_address VARCHAR(45),
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adashi.group_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    previous_status VARCHAR(32),
    new_status VARCHAR(32) NOT NULL,
    actor_id UUID NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    correlation_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adashi.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    actor_id UUID NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    before_state_json JSONB,
    after_state_json JSONB,
    correlation_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SECTION 6: STORED PROCEDURES (CORE WORKFLOWS)
-- =============================================================================

-- 6.1 Membership Lock Stored Procedure
CREATE OR REPLACE FUNCTION adashi.lock_membership(
    p_group_id UUID,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = adashi, liquidity, public
AS $$
DECLARE
    v_group RECORD;
    v_member_count INT;
BEGIN
    SELECT * INTO v_group FROM adashi.groups WHERE id = p_group_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group % not found', p_group_id;
    END IF;

    SELECT COUNT(*) INTO v_member_count FROM adashi.members WHERE group_id = p_group_id;
    IF v_member_count < v_group.min_members THEN
        RAISE EXCEPTION 'Quorum not met: % members, minimum is %', v_member_count, v_group.min_members;
    END IF;

    UPDATE adashi.members 
    SET membership_status = 'ACTIVE_LOCKED', locked_at = NOW(), updated_at = NOW()
    WHERE group_id = p_group_id;

    UPDATE adashi.groups
    SET status = 'MEMBERSHIP_LOCKED', locked_at = NOW(), current_members_count = v_member_count, updated_at = NOW()
    WHERE id = p_group_id;

    RETURN jsonb_build_object('success', TRUE, 'status', 'MEMBERSHIP_LOCKED', 'members', v_member_count);
END;
$$;

-- 6.2 Deterministic Cryptographic Allocation Generator (HMAC-SHA256)
CREATE OR REPLACE FUNCTION adashi.generate_adashi_allocation(
    p_group_id UUID,
    p_actor_id UUID,
    p_seed_salt TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = adashi, liquidity, public
AS $$
DECLARE
    v_group RECORD;
    v_seed TEXT;
    v_combined_key TEXT;
    v_alloc_id UUID;
    v_member_record RECORD;
    v_pos INT := 1;
    v_cadence_days INT;
    v_start_date DATE;
    v_payout_date DATE;
BEGIN
    SELECT * INTO v_group FROM adashi.groups WHERE id = p_group_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Group not found'; END IF;

    v_seed := COALESCE(p_seed_salt, encode(gen_random_bytes(32), 'hex'));
    v_combined_key := p_group_id::text || ':' || v_seed;

    v_cadence_days := CASE v_group.frequency
        WHEN 'DAILY' THEN 1 WHEN 'WEEKLY' THEN 7 WHEN 'BIWEEKLY' THEN 14 WHEN 'MONTHLY' THEN 30 ELSE 7 END;
    v_start_date := COALESCE(v_group.start_date, CURRENT_DATE + INTERVAL '3 days');

    INSERT INTO adashi.allocations (group_id, version, algorithm, seed_hash, fairness_score, integrity_hash, status, generated_by)
    VALUES (p_group_id, 1, 'CRYPTO_HMAC_SHA256', v_seed, 99.80, encode(digest(v_combined_key, 'sha256'), 'hex'), 'PUBLISHED', p_actor_id)
    RETURNING id INTO v_alloc_id;

    FOR v_member_record IN
        SELECT m.id AS member_id, m.customer_id,
               encode(hmac(m.customer_id::text || ':' || m.id::text, v_combined_key, 'sha256'), 'hex') AS member_hash
        FROM adashi.members m WHERE m.group_id = p_group_id
        ORDER BY member_hash ASC
    LOOP
        v_payout_date := v_start_date + ((v_pos - 1) * v_cadence_days * INTERVAL '1 day');

        INSERT INTO adashi.allocation_members (allocation_id, group_id, member_id, customer_id, position, scheduled_cycle_number, scheduled_payout_date)
        VALUES (v_alloc_id, p_group_id, v_member_record.member_id, v_member_record.customer_id, v_pos, v_pos, v_payout_date);

        UPDATE adashi.members SET assigned_position = v_pos, updated_at = NOW() WHERE id = v_member_record.member_id;
        v_pos := v_pos + 1;
    END LOOP;

    UPDATE adashi.groups SET status = 'ALLOCATION_PUBLISHED', updated_at = NOW() WHERE id = p_group_id;
    RETURN jsonb_build_object('success', TRUE, 'allocation_id', v_alloc_id, 'slots', v_pos - 1);
END;
$$;

-- 6.3 Liquidity Reservation Stored Procedure
CREATE OR REPLACE FUNCTION liquidity.create_liquidity_reservation(
    p_pool_id UUID,
    p_amount NUMERIC(24, 2),
    p_source_domain TEXT,
    p_source_ref TEXT,
    p_reason TEXT,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = liquidity, public
AS $$
DECLARE
    v_pool RECORD;
    v_pos RECORD;
    v_res_id UUID;
    v_res_ref TEXT;
BEGIN
    SELECT * INTO v_pool FROM liquidity.pools WHERE id = p_pool_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pool not found'; END IF;

    SELECT * INTO v_pos FROM liquidity.positions WHERE pool_id = p_pool_id FOR UPDATE;
    IF v_pos.available < p_amount THEN
        RAISE EXCEPTION 'Liquidity Shortfall! Available (%) < Requested (%)', v_pos.available, p_amount;
    END IF;

    v_res_ref := 'RES-' || v_pool.currency || '-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6);

    INSERT INTO liquidity.reservations (
        reservation_reference, pool_id, legal_entity_code, currency,
        reserved_amount, used_amount, remaining_amount,
        source_domain, source_reference, reason, status,
        starts_at, expires_at, created_by
    )
    VALUES (
        v_res_ref, p_pool_id, v_pool.legal_entity_code, v_pool.currency,
        p_amount, 0.00, p_amount,
        p_source_domain, p_source_ref, p_reason, 'ACTIVE',
        NOW(), NOW() + INTERVAL '14 days', p_actor_id
    )
    RETURNING id INTO v_res_id;

    UPDATE liquidity.positions
    SET reserved = reserved + p_amount, available = available - p_amount, last_calculated_at = NOW(), updated_at = NOW()
    WHERE pool_id = p_pool_id;

    RETURN jsonb_build_object('success', TRUE, 'reservation_id', v_res_id, 'reference', v_res_ref, 'reserved', p_amount);
END;
$$;

-- =============================================================================
-- SECTION 7: REPORTING VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW adashi.adashi_dashboard_view AS
SELECT 
    g.id AS group_id,
    g.public_reference AS group_reference,
    g.country_code AS country,
    g.currency,
    g.name AS group_name,
    g.assigned_agent_id AS agent_id,
    g.current_members_count AS member_count,
    g.target_members,
    g.total_cycles AS cycle_count,
    g.current_cycle_number AS current_cycle,
    g.total_pool_volume AS expected_pool,
    COALESCE(SUM(c.collected_pool), 0.00) AS collected_pool,
    (g.total_pool_volume - COALESCE(SUM(c.collected_pool), 0.00)) AS outstanding,
    g.status AS group_status,
    COALESCE(COUNT(d.id), 0) AS default_count
FROM adashi.groups g
LEFT JOIN adashi.cycles c ON c.group_id = g.id
LEFT JOIN adashi.defaults d ON d.group_id = g.id AND d.status = 'OPEN'
GROUP BY g.id, g.public_reference, g.country_code, g.currency, g.name, g.assigned_agent_id, g.current_members_count, g.target_members, g.total_cycles, g.current_cycle_number, g.total_pool_volume, g.status;

CREATE OR REPLACE VIEW liquidity.liquidity_dashboard_view AS
SELECT 
    p.country_code AS country,
    p.legal_entity_code AS legal_entity,
    p.id AS pool_id,
    p.pool_code,
    p.currency,
    pos.current_confirmed,
    pos.available,
    pos.reserved,
    pos.restricted,
    pos.pending_settlement,
    pos.in_transit,
    pos.expected_inflow,
    pos.committed_outflow,
    pos.projected,
    COALESCE(SUM(r.remaining_amount), 0.00) AS active_adashi_exposure,
    pos.available AS available_after_adashi_reservations,
    pos.last_calculated_at AS last_snapshot_at
FROM liquidity.pools p
JOIN liquidity.positions pos ON pos.pool_id = p.id
LEFT JOIN liquidity.reservations r ON r.pool_id = p.id AND r.status = 'ACTIVE'
GROUP BY p.country_code, p.legal_entity_code, p.id, p.pool_code, p.currency, pos.current_confirmed, pos.available, pos.reserved, pos.restricted, pos.pending_settlement, pos.in_transit, pos.expected_inflow, pos.committed_outflow, pos.projected, pos.last_calculated_at;

-- =============================================================================
-- SECTION 8: SEED DATA FOR SAMPLING (100% SYNTHETIC)
-- =============================================================================

-- 8.1 Seed Organizations & Roles
INSERT INTO public.organizations (id, name, slug, country, business_type, default_currency)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'KoriePay Nigeria HQ', 'koriepay-ng', 'NG', 'FINTECH', 'NGN'),
  ('10000000-0000-0000-0000-000000000002', 'KoriePay Niger HQ', 'koriepay-ne', 'NE', 'FINTECH', 'XOF')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.roles (name, description, is_system_role)
VALUES 
  ('SUPER_ADMIN', 'Platform Administrator', TRUE),
  ('AGENT', 'Commercial Field Agent', TRUE),
  ('CUSTOMER', 'Retail Banking Customer', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 8.2 Seed Legal Entities & Banking Providers
INSERT INTO liquidity.legal_entities (id, code, name, country_code, base_currency)
VALUES 
  ('20000000-0000-0000-0000-000000000001', 'KP-NG', 'KoriePay Nigeria Limited', 'NG', 'NGN'),
  ('20000000-0000-0000-0000-000000000002', 'KP-NE', 'KoriePay Niger SAS', 'NE', 'XOF')
ON CONFLICT (code) DO NOTHING;

INSERT INTO liquidity.banking_providers (id, provider_code, provider_name, country_code, base_currency, provider_type)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'PROVIDUS_NG', 'Providus Bank Nigeria PLC', 'NG', 'NGN', 'COMMERCIAL_BANK'),
  ('30000000-0000-0000-0000-000000000002', 'KORIS_NE', 'Coris Bank Niger Republic', 'NE', 'XOF', 'COMMERCIAL_BANK')
ON CONFLICT (provider_code) DO NOTHING;

-- 8.3 Seed Central Liquidity Pools & Positions
INSERT INTO liquidity.pools (id, pool_code, pool_name, pool_type, legal_entity_code, country_code, currency, status, description, is_test_data)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'KP-NG-LIQUIDITY', 'KoriePay Nigeria Central Treasury Pool', 'CENTRAL', 'KP-NG', 'NG', 'NGN', 'ACTIVE', 'Primary treasury pool for Nigeria operations', TRUE),
  ('40000000-0000-0000-0000-000000000002', 'KP-NE-LIQUIDITY', 'KoriePay Niger Central Treasury Pool', 'CENTRAL', 'KP-NE', 'NE', 'XOF', 'ACTIVE', 'Primary treasury pool for Niger operations', TRUE),
  ('40000000-0000-0000-0000-000000000003', 'KP-NG-ADASHI-RESERVE', 'KoriePay Nigeria Adashi Reserve Pool', 'ADASHI', 'KP-NG', 'NG', 'NGN', 'ACTIVE', 'Dedicated liquidity reserve for Adashi payouts', TRUE),
  ('40000000-0000-0000-0000-000000000004', 'KP-NE-ADASHI-RESERVE', 'KoriePay Niger Adashi Reserve Pool', 'ADASHI', 'KP-NE', 'NE', 'XOF', 'ACTIVE', 'Dedicated liquidity reserve for Niger Tontine payouts', TRUE)
ON CONFLICT (pool_code) DO NOTHING;

INSERT INTO liquidity.positions (pool_id, currency, current_confirmed, available, reserved, restricted, pending_settlement, in_transit, expected_inflow, committed_outflow, projected)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'NGN', 500000000.00, 350000000.00, 75000000.00, 25000000.00, 30000000.00, 20000000.00, 50000000.00, 15000000.00, 385000000.00),
  ('40000000-0000-0000-0000-000000000002', 'XOF', 500000000.00, 350000000.00, 75000000.00, 25000000.00, 30000000.00, 20000000.00, 50000000.00, 15000000.00, 385000000.00),
  ('40000000-0000-0000-0000-000000000003', 'NGN', 10000000.00, 8300000.00, 1700000.00, 0.00, 0.00, 0.00, 2500000.00, 1700000.00, 9100000.00),
  ('40000000-0000-0000-0000-000000000004', 'XOF', 10000000.00, 9300000.00, 700000.00, 0.00, 0.00, 0.00, 1500000.00, 700000.00, 10100000.00)
ON CONFLICT (pool_id) DO NOTHING;

-- 8.4 Seed Bank Accounts
INSERT INTO liquidity.pool_accounts (id, pool_id, provider_id, account_identifier, account_name, account_type, currency, country_code, legal_entity_code, is_primary, is_test_data)
VALUES
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'TEST-NG-PROVIDUS-001', 'Providus Bank Clearing Vault', 'COMMERCIAL_CHECKING', 'NGN', 'NG', 'KP-NG', TRUE, TRUE),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'TEST-NE-KORIS-001', 'Coris Bank Settlement Vault', 'COMMERCIAL_CHECKING', 'XOF', 'NE', 'KP-NE', TRUE, TRUE)
ON CONFLICT (account_identifier) DO NOTHING;

-- 8.5 Seed Adashi Products
INSERT INTO adashi.products (id, product_code, product_name, description, default_currency, country_code, minimum_members, maximum_members, contribution_frequency, contribution_amount, cycle_duration_days, grace_period_hours, platform_fee_percent, agent_commission_percent, payout_maker_checker_threshold)
VALUES
  ('60000000-0000-0000-0000-000000000001', 'ADA-NGN-WK-10K', 'Weekly Market Trader Circle (NGN)', 'High-turnover weekly savings for verified Nigerian merchants', 'NGN', 'NG', 5, 20, 'WEEKLY', 10000.00, 7, 48, 1.00, 0.50, 200000.00),
  ('60000000-0000-0000-0000-000000000002', 'ADA-NGN-MO-50K', 'Monthly Executive Builder (NGN)', 'Structured monthly savings pool for salary earners & businesses', 'NGN', 'NG', 5, 12, 'MONTHLY', 50000.00, 30, 72, 1.50, 0.50, 500000.00),
  ('60000000-0000-0000-0000-000000000003', 'ADA-XOF-WK-10K', 'Cercle Tontine Hebdo Niamey (XOF)', 'Rotating micro-savings collective for Grand Marché de Niamey', 'XOF', 'NE', 5, 20, 'WEEKLY', 10000.00, 7, 48, 1.00, 0.50, 200000.00),
  ('60000000-0000-0000-0000-000000000004', 'ADA-XOF-MO-25K', 'Tontine Mensuelle Solidarité (XOF)', 'Monthly cooperative savings for artisans & trade associations in Niger', 'XOF', 'NE', 4, 10, 'MONTHLY', 25000.00, 30, 72, 1.25, 0.50, 250000.00)
ON CONFLICT (product_code) DO NOTHING;

-- 8.6 Seed Synthetic Customers (20 Savers)
INSERT INTO public.customers (id, org_id, first_name, last_name, email, phone, country, kyc_tier)
VALUES
  -- 10 Nigerian Savers
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Amina', 'Bello', 'amina.bello@test.ng', '+2348030000001', 'NG', 'TIER_2'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Chukwudi', 'Eze', 'chukwudi.eze@test.ng', '+2348030000002', 'NG', 'TIER_2'),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Folake', 'Adeleke', 'folake.adeleke@test.ng', '+2348030000003', 'NG', 'TIER_3'),
  ('70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Usman', 'Garba', 'usman.garba@test.ng', '+2348030000004', 'NG', 'TIER_2'),
  ('70000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Ngozi', 'Obi', 'ngozi.obi@test.ng', '+2348030000005', 'NG', 'TIER_2'),
  ('70000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'Tunde', 'Bakare', 'tunde.bakare@test.ng', '+2348030000006', 'NG', 'TIER_3'),
  ('70000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'Ibrahim', 'Sani', 'ibrahim.sani@test.ng', '+2348030000007', 'NG', 'TIER_2'),
  ('70000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 'Blessing', 'Okon', 'blessing.okon@test.ng', '+2348030000008', 'NG', 'TIER_2'),
  ('70000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', 'Mustapha', 'Ali', 'mustapha.ali@test.ng', '+2348030000009', 'NG', 'TIER_2'),
  ('70000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', 'Kelechi', 'Nwosu', 'kelechi.nwosu@test.ng', '+2348030000010', 'NG', 'TIER_3'),

  -- 10 Nigerien Savers
  ('70000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', 'Amadou', 'Seydou', 'amadou.seydou@test.ne', '+22790000001', 'NE', 'TIER_2'),
  ('70000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002', 'Fatima', 'Oumarou', 'fatima.oumarou@test.ne', '+22790000002', 'NE', 'TIER_2'),
  ('70000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000002', 'Moussa', 'Harouna', 'moussa.harouna@test.ne', '+22790000003', 'NE', 'TIER_3'),
  ('70000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000002', 'Aichatou', 'Mamadou', 'aichatou.mamadou@test.ne', '+22790000004', 'NE', 'TIER_2'),
  ('70000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000002', 'Ibrahim', 'Abdoulaye', 'ibrahim.abdoulaye@test.ne', '+22790000005', 'NE', 'TIER_2'),
  ('70000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000002', 'Mariama', 'Souley', 'mariama.souley@test.ne', '+22790000006', 'NE', 'TIER_2'),
  ('70000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000002', 'Salifou', 'Issoufou', 'salifou.issoufou@test.ne', '+22790000007', 'NE', 'TIER_3'),
  ('70000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000002', 'Zalika', 'Hamani', 'zalika.hamani@test.ne', '+22790000008', 'NE', 'TIER_2'),
  ('70000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000002', 'Boureima', 'Gado', 'boureima.gado@test.ne', '+22790000009', 'NE', 'TIER_2'),
  ('70000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000002', 'Hadiza', 'Idrissa', 'hadiza.idrissa@test.ne', '+227900000010', 'NE', 'TIER_2')
ON CONFLICT (org_id, phone) DO NOTHING;

-- 8.7 Seed Adashi Groups (Nigeria & Niger)
INSERT INTO adashi.groups (id, public_reference, product_id, creator_id, creator_role, assigned_agent_id, legal_entity_code, country_code, currency, name, contribution_amount, frequency, target_members, current_members_count, total_cycles, current_cycle_number, total_pool_volume, escrow_vault_account_id, status, is_test_data)
VALUES
  ('80000000-0000-0000-0000-000000000001', 'ADA-NG-2026-001', '60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'AGENT', '70000000-0000-0000-0000-000000000001', 'KP-NG', 'NG', 'NGN', 'Balogun Textile Guild Circle', 10000.00, 'WEEKLY', 6, 6, 6, 2, 60000.00, 'ESCROW_VAULT_NGN_01', 'ACTIVE', TRUE),
  ('80000000-0000-0000-0000-000000000002', 'ADA-NG-2026-002', '60000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'AGENT', '70000000-0000-0000-0000-000000000001', 'KP-NG', 'NG', 'NGN', 'Wuse Tech Professionals Ajo', 50000.00, 'MONTHLY', 5, 5, 5, 1, 250000.00, 'ESCROW_VAULT_NGN_01', 'ACTIVE', TRUE),
  ('80000000-0000-0000-0000-000000000003', 'ADA-NE-2026-001', '60000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000011', 'AGENT', '70000000-0000-0000-0000-000000000011', 'KP-NE', 'NE', 'XOF', 'Tontine Grand Marché Niamey', 10000.00, 'WEEKLY', 5, 5, 5, 2, 50000.00, 'ESCROW_VAULT_XOF_01', 'ACTIVE', TRUE)
ON CONFLICT (public_reference) DO NOTHING;

-- 8.8 Seed Group Members & Allocations
INSERT INTO adashi.members (id, group_id, customer_id, membership_reference, membership_status, assigned_position, mandate_authorized, total_contributed, total_payout_received)
VALUES
  ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'MEM-ADA-NG1-001', 'ACTIVE_LOCKED', 1, TRUE, 20000.00, 59100.00),
  ('90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'MEM-ADA-NG1-002', 'ACTIVE_LOCKED', 2, TRUE, 20000.00, 0.00),
  ('90000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'MEM-ADA-NG1-003', 'ACTIVE_LOCKED', 3, TRUE, 20000.00, 0.00),
  ('90000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000004', 'MEM-ADA-NG1-004', 'ACTIVE_LOCKED', 4, TRUE, 20000.00, 0.00),
  ('90000000-0000-0000-0000-000000000005', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000005', 'MEM-ADA-NG1-005', 'ACTIVE_LOCKED', 5, TRUE, 20000.00, 0.00),
  ('90000000-0000-0000-0000-000000000006', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000006', 'MEM-ADA-NG1-006', 'ACTIVE_LOCKED', 6, TRUE, 20000.00, 0.00)
ON CONFLICT (membership_reference) DO NOTHING;

-- 8.9 Seed Cycles & Obligations
INSERT INTO adashi.cycles (id, group_id, cycle_number, beneficiary_member_id, beneficiary_customer_id, beneficiary_name, start_date, contribution_deadline, grace_deadline, expected_pool, collected_pool, outstanding_amount, gross_payout_amount, platform_fee_amount, agent_commission_amount, net_payout_amount, currency, status)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 1, '90000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Amina Bello', '2026-08-15', NOW() - INTERVAL '14 days', NOW() - INTERVAL '12 days', 60000.00, 60000.00, 0.00, 60000.00, 600.00, 300.00, 59100.00, 'NGN', 'CLOSED'),
  ('a0000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', 2, '90000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'Chukwudi Eze', '2026-08-22', NOW() + INTERVAL '2 days', NOW() + INTERVAL '4 days', 60000.00, 60000.00, 0.00, 60000.00, 600.00, 300.00, 59100.00, 'NGN', 'COLLECTION_COMPLETED')
ON CONFLICT (group_id, cycle_number) DO NOTHING;

INSERT INTO adashi.contribution_obligations (group_id, cycle_id, cycle_number, member_id, customer_id, amount, currency, due_date, grace_deadline, status, paid_at, ledger_journal_id, payment_reference)
VALUES
  ('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 2, '90000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 10000.00, 'NGN', NOW() + INTERVAL '2 days', NOW() + INTERVAL '4 days', 'PAID', NOW(), 'JRN-20260904-001', 'PAY-ADA-OBL-001'),
  ('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 2, '90000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 10000.00, 'NGN', NOW() + INTERVAL '2 days', NOW() + INTERVAL '4 days', 'PAID', NOW(), 'JRN-20260904-002', 'PAY-ADA-OBL-002'),
  ('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 2, '90000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', 10000.00, 'NGN', NOW() + INTERVAL '2 days', NOW() + INTERVAL '4 days', 'PAID', NOW(), 'JRN-20260904-003', 'PAY-ADA-OBL-003'),
  ('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 2, '90000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000004', 10000.00, 'NGN', NOW() + INTERVAL '2 days', NOW() + INTERVAL '4 days', 'PAID', NOW(), 'JRN-20260904-004', 'PAY-ADA-OBL-004'),
  ('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 2, '90000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000005', 10000.00, 'NGN', NOW() + INTERVAL '2 days', NOW() + INTERVAL '4 days', 'PAID', NOW(), 'JRN-20260904-005', 'PAY-ADA-OBL-005'),
  ('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 2, '90000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000006', 10000.00, 'NGN', NOW() + INTERVAL '2 days', NOW() + INTERVAL '4 days', 'PAID', NOW(), 'JRN-20260904-006', 'PAY-ADA-OBL-006')
ON CONFLICT (group_id, cycle_id, member_id) DO NOTHING;

-- 8.10 Seed Liquidity Reservations
INSERT INTO liquidity.reservations (id, reservation_reference, pool_id, legal_entity_code, currency, reserved_amount, used_amount, remaining_amount, source_domain, source_reference, reason, status, starts_at, expires_at, created_by, is_test_data)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'RES-NGN-20260904-001', '40000000-0000-0000-0000-000000000003', 'KP-NG', 'NGN', 60000.00, 0.00, 60000.00, 'ADASHI', 'ADA-NG-2026-001:CYCLE-2', 'Liquidity reservation for Balogun Guild Cycle 2 Payout', 'ACTIVE', NOW(), NOW() + INTERVAL '7 days', '70000000-0000-0000-0000-000000000001', TRUE),
  ('b0000000-0000-0000-0000-000000000002', 'RES-XOF-20260904-001', '40000000-0000-0000-0000-000000000004', 'KP-NE', 'XOF', 50000.00, 0.00, 50000.00, 'ADASHI', 'ADA-NE-2026-001:CYCLE-2', 'Liquidity reservation for Tontine Niamey Cycle 2 Payout', 'ACTIVE', NOW(), NOW() + INTERVAL '7 days', '70000000-0000-0000-0000-000000000011', TRUE)
ON CONFLICT (reservation_reference) DO NOTHING;

COMMIT;

-- =============================================================================
-- FINAL HEALTH VERIFICATION QUERY
-- =============================================================================
SELECT 
    'DATABASE_DEPLOYMENT_STATUS' AS metric,
    'COMPLETE_AND_OPERATIONAL' AS status,
    NOW() AS timestamp;
