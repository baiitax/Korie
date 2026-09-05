-- =============================================================================
-- KORIEPAY TIER-1 FINANCIAL PLATFORM: ENTERPRISE ADASHI / AJO & CENTRAL LIQUIDITY POOL
-- Migration: 20260904000027_adashi_and_central_liquidity_pool.sql
-- Description: Complete production schema for Adashi/ROSCA Orchestration & Central Treasury Liquidity Engine
-- Multi-Jurisdiction: Nigeria (NG / NGN) & Niger Republic (NE / XOF)
-- Author: Principal PostgreSQL & Financial Systems Architect
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- SECTION 2: DEDICATED DOMAIN SCHEMAS
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS adashi;
CREATE SCHEMA IF NOT EXISTS liquidity;

-- =============================================================================
-- SECTION 3: REFERENCE DATA & LEGAL ENTITIES
-- =============================================================================

-- 3.1 Legal Entities (Nigeria & Niger Republic)
CREATE TABLE IF NOT EXISTS liquidity.legal_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(16) UNIQUE NOT NULL, -- e.g. KP-NG, KP-NE
    name VARCHAR(255) NOT NULL,
    country_code VARCHAR(2) NOT NULL CHECK (country_code IN ('NG', 'NE')),
    base_currency VARCHAR(3) NOT NULL CHECK (base_currency IN ('NGN', 'XOF')),
    tax_id VARCHAR(64),
    registration_number VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 Banking / Settlement Providers Reference
CREATE TABLE IF NOT EXISTS liquidity.banking_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. PROVIDUS_NG, KORIS_NE
    provider_name VARCHAR(128) NOT NULL,
    country_code VARCHAR(2) NOT NULL CHECK (country_code IN ('NG', 'NE')),
    base_currency VARCHAR(3) NOT NULL CHECK (base_currency IN ('NGN', 'XOF')),
    provider_type VARCHAR(32) NOT NULL CHECK (provider_type IN ('COMMERCIAL_BANK', 'CENTRAL_BANK', 'SWITCH', 'MOBILE_MONEY')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Foundational Legal Entities
INSERT INTO liquidity.legal_entities (code, name, country_code, base_currency, status, effective_date)
VALUES 
  ('KP-NG', 'KoriePay Nigeria Limited', 'NG', 'NGN', 'ACTIVE', '2026-01-01'),
  ('KP-NE', 'KoriePay Niger SAS', 'NE', 'XOF', 'ACTIVE', '2026-01-01')
ON CONFLICT (code) DO NOTHING;

-- Seed Configurable Banking Providers
INSERT INTO liquidity.banking_providers (provider_code, provider_name, country_code, base_currency, provider_type, is_active)
VALUES
  ('PROVIDUS_NG', 'Providus Bank Nigeria PLC', 'NG', 'NGN', 'COMMERCIAL_BANK', TRUE),
  ('KORIS_NE', 'Coris Bank Niger Republic', 'NE', 'XOF', 'COMMERCIAL_BANK', TRUE)
ON CONFLICT (provider_code) DO NOTHING;

-- =============================================================================
-- SECTION 4: DOMAIN A — ADASHI / AJO / ROSCA SCHEMA
-- =============================================================================

-- 4.1 Adashi Product Catalog
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
    allocation_method VARCHAR(64) NOT NULL DEFAULT 'CRYPTO_HMAC_SHA256' CHECK (allocation_method IN ('CRYPTO_HMAC_SHA256', 'AGREED_ORDER', 'BIDDING', 'SENIORITY')),
    payout_policy VARCHAR(64) NOT NULL DEFAULT '100_PERCENT_COLLECTION' CHECK (payout_policy IN ('100_PERCENT_COLLECTION', 'PARTIAL_WITH_RESERVE_COVER')),
    default_policy VARCHAR(64) NOT NULL DEFAULT 'AGENT_GUARANTEE_AND_LIEN' CHECK (default_policy IN ('AGENT_GUARANTEE_AND_LIEN', 'POOL_RESERVE_OFFSET', 'LEGAL_RECOVERY')),
    exit_policy VARCHAR(64) NOT NULL DEFAULT 'SUBSTITUTION_REQUIRED' CHECK (exit_policy IN ('SUBSTITUTION_REQUIRED', 'FORFEIT_FEES_AND_SETTLE', 'NO_EXIT_AFTER_LOCK')),
    cancellation_policy VARCHAR(64) NOT NULL DEFAULT 'PRE_START_REFUND' CHECK (cancellation_policy IN ('PRE_START_REFUND', 'MAKER_CHECKER_APPROVAL')),
    platform_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 5.00),
    agent_commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.50 CHECK (agent_commission_percent >= 0 AND agent_commission_percent <= 3.00),
    requires_maker_checker_payout BOOLEAN NOT NULL DEFAULT TRUE,
    payout_maker_checker_threshold NUMERIC(24, 2) NOT NULL DEFAULT 500000.00 CHECK (payout_maker_checker_threshold >= 0),
    risk_profile VARCHAR(32) NOT NULL DEFAULT 'STANDARD' CHECK (risk_profile IN ('LOW_RISK', 'STANDARD', 'ENHANCED_DILIGENCE')),
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_adashi_prod_jurisdiction CHECK (
      (country_code = 'NG' AND default_currency = 'NGN') OR
      (country_code = 'NE' AND default_currency = 'XOF')
    )
);

-- 4.2 Product Versions (Immutable Historical Catalog Snapshots)
CREATE TABLE IF NOT EXISTS adashi.product_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES adashi.products(id) ON DELETE RESTRICT,
    version INT NOT NULL,
    definition_json JSONB NOT NULL,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_adashi_product_version UNIQUE (product_id, version)
);

-- 4.3 Adashi Groups (Circles)
CREATE TABLE IF NOT EXISTS adashi.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. ADA-NG-2026-0001
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
    contribution_deadline_time TIME NOT NULL DEFAULT '18:00:00',
    grace_period_hours INT NOT NULL DEFAULT 48,
    allocation_method VARCHAR(64) NOT NULL DEFAULT 'CRYPTO_HMAC_SHA256',
    total_cycles INT NOT NULL,
    current_cycle_number INT NOT NULL DEFAULT 0 CHECK (current_cycle_number >= 0),
    total_pool_volume NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (total_pool_volume >= 0),
    escrow_vault_account_id VARCHAR(64) NOT NULL, -- Reference to ledger custodial vault account
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',
        'OPEN_FOR_MEMBERS',
        'MEMBERSHIP_REVIEW',
        'MEMBERSHIP_LOCKED',
        'ALLOCATION_PENDING',
        'ALLOCATION_GENERATED',
        'ALLOCATION_VERIFIED',
        'ALLOCATION_PUBLISHED',
        'ACTIVE',
        'CYCLE_IN_PROGRESS',
        'COMPLETION_PENDING',
        'COMPLETED',
        'CLOSED',
        'SUSPENDED',
        'RESTRICTED',
        'DEFAULT_REVIEW',
        'PAYOUT_HOLD',
        'FINANCIAL_EXCEPTION',
        'CANCELLED',
        'TERMINATED'
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

-- 4.4 Adashi Group State Snapshots / Versions
CREATE TABLE IF NOT EXISTS adashi.group_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    version INT NOT NULL,
    state_snapshot_json JSONB NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_adashi_group_version UNIQUE (group_id, version)
);

-- 4.5 Adashi Group Lifecycle Events Log (Immutable)
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

-- 4.6 Adashi Group Members & Payout Turn Assignments
CREATE TABLE IF NOT EXISTS adashi.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    membership_reference VARCHAR(64) UNIQUE NOT NULL,
    membership_status VARCHAR(32) NOT NULL DEFAULT 'INVITED' CHECK (membership_status IN (
        'INVITED',
        'CONSENT_PENDING',
        'CONSENT_ACCEPTED',
        'CONSENT_REJECTED',
        'ACTIVE_LOCKED',
        'PAYOUT_RECEIVED',
        'DEFAULTED',
        'EXITED',
        'REPLACED',
        'COMPLETED'
    )),
    kyc_tier INT NOT NULL DEFAULT 1 CHECK (kyc_tier IN (1, 2, 3)),
    assigned_position INT CHECK (assigned_position >= 1),
    mandate_authorized BOOLEAN NOT NULL DEFAULT FALSE,
    mandate_authorized_at TIMESTAMPTZ,
    mandate_reference VARCHAR(128),
    total_contributed NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (total_contributed >= 0),
    total_payout_received NUMERIC(24, 2) NOT NULL DEFAULT 0.00 CHECK (total_payout_received >= 0),
    risk_status VARCHAR(32) NOT NULL DEFAULT 'CLEAR' CHECK (risk_status IN ('CLEAR', 'FLAGGED', 'UNDER_REVIEW', 'BLOCKED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    exit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_adashi_member_group_customer UNIQUE (group_id, customer_id),
    CONSTRAINT uq_adashi_member_group_position UNIQUE (group_id, assigned_position)
);

-- 4.7 Member Lifecycle Events
CREATE TABLE IF NOT EXISTS adashi.member_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES adashi.members(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    actor_id UUID NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.8 Member Invitations
CREATE TABLE IF NOT EXISTS adashi.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL,
    inviter_role VARCHAR(32) NOT NULL CHECK (inviter_role IN ('AGENT', 'CUSTOMER', 'ADMIN')),
    invitee_name VARCHAR(128) NOT NULL,
    invitee_phone VARCHAR(32) NOT NULL,
    invitee_email VARCHAR(128),
    invitation_code VARCHAR(32) UNIQUE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED' CHECK (status IN (
        'CREATED',
        'SENT',
        'DELIVERED',
        'VIEWED',
        'ACCEPTED',
        'DECLINED',
        'EXPIRED',
        'CANCELLED'
    )),
    expires_at TIMESTAMPTZ NOT NULL,
    delivered_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    actioned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.9 Electronic Consents & Mandate Audit Trails
CREATE TABLE IF NOT EXISTS adashi.consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    member_id UUID REFERENCES adashi.members(id) ON DELETE SET NULL,
    consent_type VARCHAR(64) NOT NULL CHECK (consent_type IN ('TERMS_AND_CONDITIONS', 'AUTO_DEBIT_MANDATE', 'ROTATION_POLICY', 'DEFAULT_RECOVERY_LIEN')),
    terms_version VARCHAR(32) NOT NULL DEFAULT 'v1.0.0',
    product_version INT NOT NULL DEFAULT 1,
    consent_status VARCHAR(32) NOT NULL DEFAULT 'ACCEPTED' CHECK (consent_status IN ('ACCEPTED', 'REVOKED', 'EXPIRED')),
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_fingerprint VARCHAR(128),
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.10 Deterministic Cryptographic Allocations
CREATE TABLE IF NOT EXISTS adashi.allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    algorithm VARCHAR(64) NOT NULL DEFAULT 'CRYPTO_HMAC_SHA256',
    algorithm_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    seed_hash VARCHAR(128) NOT NULL,
    fairness_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (fairness_score >= 0 AND fairness_score <= 100.00),
    integrity_hash VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'VERIFIED', 'PUBLISHED', 'AMENDED', 'SUPERSEDED')),
    generated_by UUID NOT NULL,
    verified_by UUID,
    published_by UUID,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_adashi_allocation_group_version UNIQUE (group_id, version)
);

-- 4.11 Allocation Version Snapshots
CREATE TABLE IF NOT EXISTS adashi.allocation_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID NOT NULL REFERENCES adashi.allocations(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    version INT NOT NULL,
    member_snapshot_json JSONB NOT NULL,
    slots_json JSONB NOT NULL,
    reason TEXT,
    approved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.12 Allocation Slot Assignments
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

-- 4.13 Rotation Change Requests (Maker-Checker Override Governance)
CREATE TABLE IF NOT EXISTS adashi.rotation_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    allocation_id UUID NOT NULL REFERENCES adashi.allocations(id) ON DELETE RESTRICT,
    maker_id UUID NOT NULL,
    maker_name VARCHAR(128) NOT NULL,
    maker_role VARCHAR(32) NOT NULL,
    requested_swap_json JSONB NOT NULL,
    justification TEXT NOT NULL,
    impact_analysis TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actioned_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS adashi.rotation_change_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES adashi.rotation_change_requests(id) ON DELETE CASCADE,
    checker_id UUID NOT NULL,
    checker_name VARCHAR(128) NOT NULL,
    checker_role VARCHAR(32) NOT NULL,
    decision VARCHAR(32) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
    checker_notes TEXT NOT NULL,
    actioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.14 Adashi Cycles
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
        'SCHEDULED',
        'CONTRIBUTION_OPEN',
        'COLLECTION_IN_PROGRESS',
        'COLLECTION_COMPLETED',
        'PAYOUT_PENDING_APPROVAL',
        'PAYOUT_PROCESSING',
        'PAYOUT_COMPLETED',
        'DEFAULT_ARREARS',
        'PAYOUT_HOLD',
        'CLOSED'
    )),
    payout_reference VARCHAR(64),
    payout_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_adashi_cycle_number UNIQUE (group_id, cycle_number)
);

-- 4.15 Cycle State Events
CREATE TABLE IF NOT EXISTS adashi.cycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES adashi.cycles(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    previous_status VARCHAR(32),
    new_status VARCHAR(32) NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.16 Contribution Obligations (Exactly One per Member per Cycle)
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
        'SCHEDULED',
        'DUE',
        'PROCESSING',
        'PAID',
        'FAILED',
        'PENDING',
        'UNKNOWN',
        'OVERDUE',
        'DEFAULTED',
        'WAIVED',
        'CANCELLED'
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

-- 4.17 Contribution Attempts (Payment Gateway / Switch Invocations)
CREATE TABLE IF NOT EXISTS adashi.contribution_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES adashi.contribution_obligations(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES adashi.cycles(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    attempt_number INT NOT NULL CHECK (attempt_number >= 1),
    payment_channel VARCHAR(32) NOT NULL DEFAULT 'WALLET_AUTO_DEBIT' CHECK (payment_channel IN ('WALLET_AUTO_DEBIT', 'CARD_TOKEN', 'NIP_DIRECT_DEBIT', 'AGENT_CASH_COLLECT')),
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_code VARCHAR(32),
    response_status VARCHAR(32) NOT NULL CHECK (response_status IN ('PENDING', 'SUCCESS', 'FAILED', 'UNKNOWN', 'TIMED_OUT')),
    provider_reference VARCHAR(128),
    error_code VARCHAR(64),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.18 Contribution Events Audit Log
CREATE TABLE IF NOT EXISTS adashi.contribution_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES adashi.contribution_obligations(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    previous_status VARCHAR(32),
    new_status VARCHAR(32) NOT NULL,
    actor_id UUID NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.19 Adashi Payouts & Disbursements
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
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'AUTHORIZED',
        'PROCESSING',
        'SUCCESS',
        'FAILED',
        'UNKNOWN',
        'REVERSED',
        'CANCELLED'
    )),
    requires_maker_checker BOOLEAN NOT NULL DEFAULT TRUE,
    maker_id UUID NOT NULL,
    checker_id UUID,
    ledger_journal_id VARCHAR(64),
    payment_reference VARCHAR(64) UNIQUE NOT NULL,
    disbursed_at TIMESTAMPTZ,
    error_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_adashi_cycle_active_payout UNIQUE (cycle_id)
);

-- 4.20 Payout Attempts
CREATE TABLE IF NOT EXISTS adashi.payout_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id UUID NOT NULL REFERENCES adashi.payouts(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL CHECK (attempt_number >= 1),
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    switch_reference VARCHAR(128),
    response_status VARCHAR(32) NOT NULL CHECK (response_status IN ('PENDING', 'SUCCESS', 'FAILED', 'UNKNOWN', 'REVERSED')),
    error_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.21 Payout Lifecycle Events
CREATE TABLE IF NOT EXISTS adashi.payout_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id UUID NOT NULL REFERENCES adashi.payouts(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    previous_status VARCHAR(32),
    new_status VARCHAR(32) NOT NULL,
    actor_id UUID NOT NULL,
    details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.22 Adashi Defaults & Guarantee Claims
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
    recovery_stage VARCHAR(32) NOT NULL DEFAULT 'GRACE_OVERDUE' CHECK (recovery_stage IN (
        'GRACE_OVERDUE',
        'AGENT_MEDIATION',
        'AUTO_WALLET_LIEN',
        'LEGAL_RECOVERY',
        'GUARANTEE_CLAIMED',
        'SETTLED',
        'WRITTEN_OFF'
    )),
    reason TEXT,
    assigned_agent_id UUID,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adashi.default_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    default_id UUID NOT NULL REFERENCES adashi.defaults(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    previous_stage VARCHAR(32),
    new_stage VARCHAR(32) NOT NULL,
    recovered_delta NUMERIC(24, 2) NOT NULL DEFAULT 0.00,
    actor_id UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.23 Member Exits & Replacements
CREATE TABLE IF NOT EXISTS adashi.member_exits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    departing_member_id UUID NOT NULL REFERENCES adashi.members(id) ON DELETE RESTRICT,
    replacement_member_id UUID REFERENCES adashi.members(id) ON DELETE RESTRICT,
    exit_reason TEXT NOT NULL,
    financial_settlement_status VARCHAR(32) NOT NULL DEFAULT 'SETTLED' CHECK (financial_settlement_status IN ('PENDING', 'SETTLED', 'FORFEITED')),
    approved_by UUID NOT NULL,
    exit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.24 Adashi Exceptions & Operational Incidents
CREATE TABLE IF NOT EXISTS adashi.exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES adashi.groups(id) ON DELETE SET NULL,
    cycle_id UUID REFERENCES adashi.cycles(id) ON DELETE SET NULL,
    exception_category VARCHAR(64) NOT NULL CHECK (exception_category IN (
        'COLLECTION_FAILURE',
        'PROVIDER_TIMEOUT',
        'UNKNOWN_TRANSACTION',
        'PAYOUT_FAILURE',
        'PAYOUT_UNKNOWN',
        'MEMBER_DEFAULT',
        'ROTATION_EXCEPTION',
        'RECONCILIATION_EXCEPTION',
        'LIQUIDITY_SHORTFALL',
        'ACCOUNT_RESTRICTION',
        'AML_REVIEW',
        'FRAUD_REVIEW',
        'SYSTEM_FAILURE'
    )),
    severity VARCHAR(16) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED')),
    entity_reference VARCHAR(128) NOT NULL,
    error_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    resolution_notes TEXT,
    resolved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS adashi.exception_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exception_id UUID NOT NULL REFERENCES adashi.exceptions(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    actor_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.25 Member Disputes & Complaints
CREATE TABLE IF NOT EXISTS adashi.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    cycle_id UUID REFERENCES adashi.cycles(id) ON DELETE SET NULL,
    member_id UUID NOT NULL REFERENCES adashi.members(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    dispute_type VARCHAR(64) NOT NULL CHECK (dispute_type IN ('PAYOUT_DELAY', 'UNAUTHORIZED_DEBIT', 'ROTATION_DISAGREEMENT', 'DEFAULT_DISPUTE', 'AGENT_MISCONDUCT')),
    description TEXT NOT NULL,
    claim_amount NUMERIC(24, 2) CHECK (claim_amount >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'REJECTED')),
    resolution TEXT,
    resolved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 4.26 Platform & Agent Fee Records
CREATE TABLE IF NOT EXISTS adashi.fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES adashi.cycles(id) ON DELETE CASCADE,
    fee_type VARCHAR(32) NOT NULL CHECK (fee_type IN ('PLATFORM_COMMISSION', 'AGENT_COMMISSION', 'LATE_PENALTY')),
    amount NUMERIC(24, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    beneficiary_party VARCHAR(64) NOT NULL, -- e.g. KORIEPAY_REVENUE, AGENT_DANLADI
    ledger_journal_id VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'ACCRUED' CHECK (status IN ('ACCRUED', 'DISBURSED', 'REVERSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.27 AML / Fraud Risk Events
CREATE TABLE IF NOT EXISTS adashi.risk_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES adashi.groups(id) ON DELETE CASCADE,
    customer_id UUID,
    risk_signal_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'LOW' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    score_delta INT NOT NULL DEFAULT 0,
    flags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.28 Customer / Agent Notifications Log
CREATE TABLE IF NOT EXISTS adashi.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES adashi.groups(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL,
    notification_type VARCHAR(64) NOT NULL,
    channel VARCHAR(16) NOT NULL CHECK (channel IN ('SMS', 'WHATSAPP', 'PUSH', 'EMAIL', 'IN_APP')),
    recipient VARCHAR(128) NOT NULL,
    content_preview TEXT NOT NULL,
    delivery_status VARCHAR(32) NOT NULL DEFAULT 'SENT' CHECK (delivery_status IN ('QUEUED', 'SENT', 'DELIVERED', 'FAILED')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.29 Automated Scheduler Execution Audit Records
CREATE TABLE IF NOT EXISTS adashi.scheduler_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(64) NOT NULL,
    cycle_id UUID,
    group_id UUID,
    items_processed INT NOT NULL DEFAULT 0,
    items_succeeded INT NOT NULL DEFAULT 0,
    items_failed INT NOT NULL DEFAULT 0,
    execution_duration_ms INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL CHECK (status IN ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED')),
    error_details TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.30 Adashi Idempotency Cache
CREATE TABLE IF NOT EXISTS adashi.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    scope VARCHAR(64) NOT NULL, -- e.g. CONTRIBUTION_DEBIT, PAYOUT_DISPATCH
    resource_id VARCHAR(64) NOT NULL,
    request_hash VARCHAR(128) NOT NULL,
    response_code INT,
    response_body_json JSONB,
    status VARCHAR(32) NOT NULL DEFAULT 'IN_FLIGHT' CHECK (status IN ('IN_FLIGHT', 'COMMITTED', 'FAILED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.31 Immutable Adashi Audit Log
CREATE TABLE IF NOT EXISTS adashi.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    actor_id UUID NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    client_ip VARCHAR(45),
    user_agent TEXT,
    before_state_json JSONB,
    after_state_json JSONB,
    correlation_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SECTION 5: DOMAIN B — CENTRAL LIQUIDITY POOL SCHEMA
-- =============================================================================

-- 5.1 Treasury Liquidity Aggregation Pools
CREATE TABLE IF NOT EXISTS liquidity.pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. KP-NG-LIQUIDITY, KP-NE-LIQUIDITY
    pool_name VARCHAR(128) NOT NULL,
    pool_type VARCHAR(32) NOT NULL CHECK (pool_type IN (
        'CENTRAL',
        'BANK',
        'SETTLEMENT',
        'OPERATIONAL',
        'AGENT',
        'ADASHI',
        'RESERVE',
        'RESTRICTED'
    )),
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

-- 5.2 Bank Liquidity Accounts (Configurable Banking Rails Nodes)
CREATE TABLE IF NOT EXISTS liquidity.pool_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES liquidity.pools(id) ON DELETE RESTRICT,
    provider_id UUID NOT NULL REFERENCES liquidity.banking_providers(id) ON DELETE RESTRICT,
    account_identifier VARCHAR(64) UNIQUE NOT NULL, -- Synthetic ID e.g. TEST-NG-PROVIDUS-001
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

-- 5.3 Multi-Dimensional Liquidity Positions (Strictly Isolated by Currency)
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

-- 5.4 Treasury Liquidity Movements
CREATE TABLE IF NOT EXISTS liquidity.movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_reference VARCHAR(64) UNIQUE NOT NULL,
    pool_id UUID NOT NULL REFERENCES liquidity.pools(id) ON DELETE RESTRICT,
    movement_type VARCHAR(64) NOT NULL CHECK (movement_type IN (
        'BANK_FUNDING',
        'BANK_WITHDRAWAL',
        'SETTLEMENT_IN',
        'SETTLEMENT_OUT',
        'ADASHI_RESERVATION',
        'ADASHI_RELEASE',
        'PAYOUT_COMMITMENT',
        'PAYOUT_RELEASE',
        'TREASURY_TRANSFER',
        'INTERCOMPANY_TRANSFER',
        'FX_CONVERSION',
        'MANUAL_ADJUSTMENT'
    )),
    direction VARCHAR(8) NOT NULL CHECK (direction IN ('INFLOW', 'OUTFLOW', 'HOLD', 'RELEASE')),
    amount NUMERIC(24, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    source_account_id UUID REFERENCES liquidity.pool_accounts(id) ON DELETE RESTRICT,
    destination_account_id UUID REFERENCES liquidity.pool_accounts(id) ON DELETE RESTRICT,
    related_domain VARCHAR(64), -- e.g. ADASHI, SETTLEMENT, TREASURY
    related_reference VARCHAR(128),
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'COMMITTED' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'COMMITTED', 'REJECTED', 'CANCELLED')),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    ledger_journal_id VARCHAR(64),
    narration TEXT NOT NULL,
    is_test_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liquidity.movement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_id UUID NOT NULL REFERENCES liquidity.movements(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    actor_id UUID NOT NULL,
    details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.5 Liquidity Reservations (Exposure Hold Without Premature Ledger Posting)
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
    source_reference VARCHAR(128) NOT NULL, -- e.g. Group ID or Cycle ID
    reason TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
        'REQUESTED',
        'ACTIVE',
        'PARTIALLY_USED',
        'CONSUMED',
        'RELEASED',
        'EXPIRED',
        'CANCELLED'
    )),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL,
    released_by UUID,
    released_at TIMESTAMPTZ,
    is_test_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liquidity.reservation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES liquidity.reservations(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    amount_delta NUMERIC(24, 2) NOT NULL DEFAULT 0.00,
    actor_id UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.6 Automated Treasury Liquidity Alerts
CREATE TABLE IF NOT EXISTS liquidity.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES liquidity.pools(id) ON DELETE CASCADE,
    alert_type VARCHAR(64) NOT NULL CHECK (alert_type IN (
        'LOW_AVAILABLE_LIQUIDITY',
        'HIGH_RESERVATION',
        'PAYOUT_EXPOSURE',
        'BANK_CONCENTRATION',
        'SETTLEMENT_GAP',
        'LIQUIDITY_SHORTFALL',
        'NEGATIVE_PROJECTED_POSITION',
        'UNRECONCILED_MOVEMENT',
        'UNUSUAL_OUTFLOW'
    )),
    severity VARCHAR(16) NOT NULL DEFAULT 'WARNING' CHECK (severity IN ('INFO', 'WARNING', 'HIGH', 'CRITICAL')),
    threshold_value NUMERIC(24, 2),
    current_value NUMERIC(24, 2),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    message TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED')),
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.7 Immutable Daily & Event-Triggered Position Snapshots
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

-- 5.8 Explicit Bilateral Foreign Exchange (FX) Quotes & Conversions
CREATE TABLE IF NOT EXISTS liquidity.fx_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fx_reference VARCHAR(64) UNIQUE NOT NULL,
    source_pool_id UUID NOT NULL REFERENCES liquidity.pools(id) ON DELETE RESTRICT,
    destination_pool_id UUID NOT NULL REFERENCES liquidity.pools(id) ON DELETE RESTRICT,
    source_currency VARCHAR(3) NOT NULL CHECK (source_currency IN ('NGN', 'XOF')),
    source_amount NUMERIC(24, 2) NOT NULL CHECK (source_amount > 0),
    target_currency VARCHAR(3) NOT NULL CHECK (target_currency IN ('NGN', 'XOF')),
    target_amount NUMERIC(24, 2) NOT NULL CHECK (target_amount > 0),
    exchange_rate NUMERIC(18, 8) NOT NULL CHECK (exchange_rate > 0),
    quote_id VARCHAR(64) NOT NULL,
    rate_timestamp TIMESTAMPTZ NOT NULL,
    approved_by UUID NOT NULL,
    ledger_journal_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'COMPLETED', 'REJECTED')),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fx_different_currencies CHECK (source_currency <> target_currency)
);

-- 5.9 Immutable Treasury Liquidity Audit Trail
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
-- SECTION 6: HIGH-PERFORMANCE DOMAIN INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_adashi_groups_status ON adashi.groups(status);
CREATE INDEX IF NOT EXISTS idx_adashi_groups_country_currency ON adashi.groups(country_code, currency);
CREATE INDEX IF NOT EXISTS idx_adashi_groups_agent ON adashi.groups(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_adashi_members_group_status ON adashi.members(group_id, membership_status);
CREATE INDEX IF NOT EXISTS idx_adashi_members_customer ON adashi.members(customer_id);
CREATE INDEX IF NOT EXISTS idx_adashi_cycles_group_status ON adashi.cycles(group_id, status);
CREATE INDEX IF NOT EXISTS idx_adashi_obligations_cycle_status ON adashi.contribution_obligations(cycle_id, status);
CREATE INDEX IF NOT EXISTS idx_adashi_obligations_customer ON adashi.contribution_obligations(customer_id);
CREATE INDEX IF NOT EXISTS idx_adashi_obligations_due ON adashi.contribution_obligations(due_date);
CREATE INDEX IF NOT EXISTS idx_adashi_payouts_group_cycle ON adashi.payouts(group_id, cycle_id);
CREATE INDEX IF NOT EXISTS idx_adashi_payouts_status ON adashi.payouts(status);
CREATE INDEX IF NOT EXISTS idx_adashi_defaults_group_status ON adashi.defaults(group_id, status);
CREATE INDEX IF NOT EXISTS idx_adashi_exceptions_status_sev ON adashi.exceptions(status, severity);
CREATE INDEX IF NOT EXISTS idx_liquidity_pools_country_curr ON liquidity.pools(country_code, currency);
CREATE INDEX IF NOT EXISTS idx_liquidity_reservations_pool_status ON liquidity.reservations(pool_id, status);
CREATE INDEX IF NOT EXISTS idx_liquidity_movements_pool_type ON liquidity.movements(pool_id, movement_type);
CREATE INDEX IF NOT EXISTS idx_liquidity_alerts_pool_status ON liquidity.alerts(pool_id, status);

-- =============================================================================
-- SECTION 7: DATABASE FUNCTIONS (STORED PROCEDURES)
-- =============================================================================

-- 7.1 Lock Membership Quorum Function
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
    v_unaccepted_count INT;
BEGIN
    SELECT * INTO v_group FROM adashi.groups WHERE id = p_group_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Adashi group % not found.', p_group_id;
    END IF;

    IF v_group.status NOT IN ('OPEN_FOR_MEMBERS', 'MEMBERSHIP_REVIEW') THEN
        RAISE EXCEPTION 'Cannot lock membership. Group status is %, must be OPEN_FOR_MEMBERS or MEMBERSHIP_REVIEW.', v_group.status;
    END IF;

    SELECT COUNT(*) INTO v_member_count FROM adashi.members WHERE group_id = p_group_id;
    IF v_member_count < v_group.min_members THEN
        RAISE EXCEPTION 'Quorum not met: group has % members, minimum required is %.', v_member_count, v_group.min_members;
    END IF;

    SELECT COUNT(*) INTO v_unaccepted_count FROM adashi.members 
    WHERE group_id = p_group_id AND membership_status NOT IN ('CONSENT_ACCEPTED', 'ACTIVE_LOCKED');
    IF v_unaccepted_count > 0 THEN
        RAISE EXCEPTION 'Cannot lock membership: % member(s) have not accepted electronic consent / mandate.', v_unaccepted_count;
    END IF;

    -- Update member statuses to ACTIVE_LOCKED
    UPDATE adashi.members 
    SET membership_status = 'ACTIVE_LOCKED', locked_at = NOW(), updated_at = NOW()
    WHERE group_id = p_group_id;

    -- Update group status
    UPDATE adashi.groups
    SET status = 'MEMBERSHIP_LOCKED', locked_at = NOW(), current_members_count = v_member_count, updated_at = NOW()
    WHERE id = p_group_id;

    -- Emit Group Event
    INSERT INTO adashi.group_events (group_id, event_type, previous_status, new_status, actor_id, actor_role, payload_json, correlation_id)
    VALUES (p_group_id, 'MEMBERSHIP_LOCKED', v_group.status, 'MEMBERSHIP_LOCKED', p_actor_id, 'AGENT', 
            jsonb_build_object('member_count', v_member_count, 'locked_at', NOW()), gen_random_uuid()::text);

    RETURN jsonb_build_object('success', TRUE, 'group_id', p_group_id, 'status', 'MEMBERSHIP_LOCKED', 'member_count', v_member_count);
END;
$$;

-- 7.2 Deterministic Cryptographic Allocation Generator (Using HMAC-SHA256)
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
    v_cycle_days INT;
    v_start_date DATE;
    v_payout_date DATE;
    v_cadence_days INT;
    v_hash_list TEXT := '';
BEGIN
    SELECT * INTO v_group FROM adashi.groups WHERE id = p_group_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Adashi group % not found.', p_group_id;
    END IF;

    IF v_group.status NOT IN ('MEMBERSHIP_LOCKED', 'ALLOCATION_PENDING') THEN
        RAISE EXCEPTION 'Cannot generate allocation. Group must be MEMBERSHIP_LOCKED (Current: %).', v_group.status;
    END IF;

    v_seed := COALESCE(p_seed_salt, encode(gen_random_bytes(32), 'hex'));
    v_combined_key := p_group_id::text || ':' || v_seed;

    v_cadence_days := CASE v_group.frequency
        WHEN 'DAILY' THEN 1
        WHEN 'WEEKLY' THEN 7
        WHEN 'BIWEEKLY' THEN 14
        WHEN 'MONTHLY' THEN 30
        ELSE 7
    END;
    v_start_date := COALESCE(v_group.start_date, CURRENT_DATE + INTERVAL '3 days');

    -- Create Allocation Record
    INSERT INTO adashi.allocations (group_id, version, algorithm, seed_hash, fairness_score, integrity_hash, status, generated_by)
    VALUES (p_group_id, 1, 'CRYPTO_HMAC_SHA256', v_seed, 99.80, encode(digest(v_combined_key, 'sha256'), 'hex'), 'PROPOSED', p_actor_id)
    RETURNING id INTO v_alloc_id;

    -- Deterministically rank locked members via HMAC-SHA256
    FOR v_member_record IN
        SELECT m.id AS member_id, m.customer_id,
               encode(hmac(m.customer_id::text || ':' || m.id::text, v_combined_key, 'sha256'), 'hex') AS member_hash
        FROM adashi.members m
        WHERE m.group_id = p_group_id
        ORDER BY member_hash ASC
    LOOP
        v_payout_date := v_start_date + ((v_pos - 1) * v_cadence_days * INTERVAL '1 day');

        INSERT INTO adashi.allocation_members (allocation_id, group_id, member_id, customer_id, position, scheduled_cycle_number, scheduled_payout_date)
        VALUES (v_alloc_id, p_group_id, v_member_record.member_id, v_member_record.customer_id, v_pos, v_pos, v_payout_date);

        -- Update Member Position
        UPDATE adashi.members
        SET assigned_position = v_pos, updated_at = NOW()
        WHERE id = v_member_record.member_id;

        v_pos := v_pos + 1;
    END LOOP;

    -- Update Group Status
    UPDATE adashi.groups
    SET status = 'ALLOCATION_PUBLISHED', updated_at = NOW()
    WHERE id = p_group_id;

    -- Emit Event
    INSERT INTO adashi.group_events (group_id, event_type, previous_status, new_status, actor_id, actor_role, payload_json, correlation_id)
    VALUES (p_group_id, 'ALLOCATION_PUBLISHED', v_group.status, 'ALLOCATION_PUBLISHED', p_actor_id, 'AGENT',
            jsonb_build_object('allocation_id', v_alloc_id, 'total_slots', v_pos - 1, 'seed', v_seed), gen_random_uuid()::text);

    RETURN jsonb_build_object('success', TRUE, 'allocation_id', v_alloc_id, 'slots_assigned', v_pos - 1, 'status', 'ALLOCATION_PUBLISHED');
END;
$$;

-- 7.3 Create Adashi Cycles & First Cycle Obligations
CREATE OR REPLACE FUNCTION adashi.create_adashi_cycles(
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
    v_alloc RECORD;
    v_slot RECORD;
    v_cadence_days INT;
    v_start_date DATE;
    v_cycle_start TIMESTAMPTZ;
    v_cycle_due TIMESTAMPTZ;
    v_grace_deadline TIMESTAMPTZ;
    v_gross NUMERIC(24, 2);
    v_plat_fee NUMERIC(24, 2);
    v_agent_fee NUMERIC(24, 2);
    v_net_payout NUMERIC(24, 2);
    v_cycle_id UUID;
    v_member RECORD;
BEGIN
    SELECT * INTO v_group FROM adashi.groups WHERE id = p_group_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group % not found.', p_group_id;
    END IF;

    v_cadence_days := CASE v_group.frequency
        WHEN 'DAILY' THEN 1
        WHEN 'WEEKLY' THEN 7
        WHEN 'BIWEEKLY' THEN 14
        WHEN 'MONTHLY' THEN 30
        ELSE 7
    END;

    v_gross := v_group.contribution_amount * v_group.target_members;
    v_plat_fee := ROUND(v_gross * 0.0100, 2); -- 1.0%
    v_agent_fee := ROUND(v_gross * 0.0050, 2); -- 0.5%
    v_net_payout := v_gross - (v_plat_fee + v_agent_fee);

    v_start_date := COALESCE(v_group.start_date, CURRENT_DATE);

    FOR v_slot IN 
        SELECT am.position, am.member_id, am.customer_id,
               COALESCE(c.first_name || ' ' || c.last_name, 'Beneficiary ' || am.position) AS customer_name
        FROM adashi.allocation_members am
        LEFT JOIN public.customers c ON c.id = am.customer_id
        WHERE am.group_id = p_group_id
        ORDER BY am.position ASC
    LOOP
        v_cycle_start := v_start_date + ((v_slot.position - 1) * v_cadence_days * INTERVAL '1 day');
        v_cycle_due := v_cycle_start + (v_cadence_days * INTERVAL '1 day');
        v_grace_deadline := v_cycle_due + (v_group.grace_period_hours * INTERVAL '1 hour');

        INSERT INTO adashi.cycles (
            group_id, cycle_number, beneficiary_member_id, beneficiary_customer_id, beneficiary_name,
            start_date, contribution_deadline, grace_deadline,
            expected_pool, collected_pool, outstanding_amount, gross_payout_amount,
            platform_fee_amount, agent_commission_amount, net_payout_amount,
            currency, status
        )
        VALUES (
            p_group_id, v_slot.position, v_slot.member_id, v_slot.customer_id, v_slot.customer_name,
            v_cycle_start::date, v_cycle_due, v_grace_deadline,
            v_gross, 0.00, v_gross, v_gross,
            v_plat_fee, v_agent_fee, v_net_payout,
            v_group.currency, CASE WHEN v_slot.position = 1 THEN 'CONTRIBUTION_OPEN' ELSE 'SCHEDULED' END
        )
        RETURNING id INTO v_cycle_id;

        -- For Cycle 1, populate member contribution obligations
        IF v_slot.position = 1 THEN
            FOR v_member IN SELECT * FROM adashi.members WHERE group_id = p_group_id LOOP
                INSERT INTO adashi.contribution_obligations (
                    group_id, cycle_id, cycle_number, member_id, customer_id,
                    amount, currency, due_date, grace_deadline, status
                )
                VALUES (
                    p_group_id, v_cycle_id, 1, v_member.id, v_member.customer_id,
                    v_group.contribution_amount, v_group.currency, v_cycle_due, v_grace_deadline, 'SCHEDULED'
                );
            END LOOP;
        END IF;
    END LOOP;

    -- Update Group Status
    UPDATE adashi.groups
    SET status = 'ACTIVE', started_at = NOW(), current_cycle_number = 1, total_pool_volume = v_gross, updated_at = NOW()
    WHERE id = p_group_id;

    RETURN jsonb_build_object('success', TRUE, 'group_id', p_group_id, 'status', 'ACTIVE', 'cycles_created', v_group.target_members);
END;
$$;

-- 7.4 Create Liquidity Reservation Function
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
    v_avail NUMERIC(24, 2);
    v_res_id UUID;
    v_res_ref TEXT;
BEGIN
    SELECT * INTO v_pool FROM liquidity.pools WHERE id = p_pool_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Liquidity pool % not found.', p_pool_id;
    END IF;

    SELECT * INTO v_pos FROM liquidity.positions WHERE pool_id = p_pool_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Liquidity position for pool % not found.', p_pool_id;
    END IF;

    -- Calculate Available Liquidity: Confirmed - Reserved - Restricted - Committed
    v_avail := v_pos.current_confirmed - v_pos.reserved - v_pos.restricted - v_pos.committed_outflow;

    IF v_avail < p_amount THEN
        RAISE EXCEPTION 'Liquidity Shortfall! Available (% %) < Requested Reservation (% %)', 
            v_avail, v_pos.currency, p_amount, v_pos.currency;
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

    -- Update Position: Increment Reserved
    UPDATE liquidity.positions
    SET reserved = reserved + p_amount,
        available = available - p_amount,
        last_calculated_at = NOW(),
        updated_at = NOW()
    WHERE pool_id = p_pool_id;

    -- Log Movement
    INSERT INTO liquidity.movements (
        movement_reference, pool_id, movement_type, direction,
        amount, currency, related_domain, related_reference,
        status, narration
    )
    VALUES (
        'MOV-' || gen_random_uuid()::text, p_pool_id, 'ADASHI_RESERVATION', 'HOLD',
        p_amount, v_pool.currency, p_source_domain, p_source_ref,
        'COMMITTED', 'Adashi Liquidity Reservation for ' || p_source_ref
    );

    RETURN jsonb_build_object('success', TRUE, 'reservation_id', v_res_id, 'reference', v_res_ref, 'reserved_amount', p_amount, 'currency', v_pool.currency);
END;
$$;

-- 7.5 Consume / Release Liquidity Reservation Function
CREATE OR REPLACE FUNCTION liquidity.consume_liquidity_reservation(
    p_reservation_id UUID,
    p_consumed_amount NUMERIC(24, 2),
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = liquidity, public
AS $$
DECLARE
    v_res RECORD;
    v_pool RECORD;
BEGIN
    SELECT * INTO v_res FROM liquidity.reservations WHERE id = p_reservation_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation % not found.', p_reservation_id;
    END IF;

    IF v_res.status NOT IN ('ACTIVE', 'PARTIALLY_USED') THEN
        RAISE EXCEPTION 'Cannot consume reservation in status %.', v_res.status;
    END IF;

    IF p_consumed_amount > v_res.remaining_amount THEN
        RAISE EXCEPTION 'Consumed amount (%) exceeds remaining reserved amount (%).', p_consumed_amount, v_res.remaining_amount;
    END IF;

    UPDATE liquidity.reservations
    SET used_amount = used_amount + p_consumed_amount,
        remaining_amount = remaining_amount - p_consumed_amount,
        status = CASE WHEN remaining_amount - p_consumed_amount = 0 THEN 'CONSUMED' ELSE 'PARTIALLY_USED' END,
        updated_at = NOW()
    WHERE id = p_reservation_id;

    -- Release the consumed amount from pool's reserved position
    UPDATE liquidity.positions
    SET reserved = reserved - p_consumed_amount,
        last_calculated_at = NOW(),
        updated_at = NOW()
    WHERE pool_id = v_res.pool_id;

    -- Log Movement
    INSERT INTO liquidity.movements (
        movement_reference, pool_id, movement_type, direction,
        amount, currency, related_domain, related_reference,
        status, narration
    )
    VALUES (
        'MOV-' || gen_random_uuid()::text, v_res.pool_id, 'PAYOUT_RELEASE', 'RELEASE',
        p_consumed_amount, v_res.currency, v_res.source_domain, v_res.source_reference,
        'COMMITTED', 'Consumed reservation ' || v_res.reservation_reference || ' on payout execution'
    );

    RETURN jsonb_build_object('success', TRUE, 'reservation_id', p_reservation_id, 'consumed_amount', p_consumed_amount, 'status', 'CONSUMED');
END;
$$;

-- =============================================================================
-- SECTION 8: DATABASE TRIGGERS (INTEGRITY & IMMUTABILITY)
-- =============================================================================

-- 8.1 Prevent Deletion of Members once Group is Locked
CREATE OR REPLACE FUNCTION adashi.prohibit_locked_member_deletion()
RETURNS TRIGGER AS $$
DECLARE
    v_status VARCHAR(32);
BEGIN
    SELECT status INTO v_status FROM adashi.groups WHERE id = OLD.group_id;
    IF v_status NOT IN ('DRAFT', 'OPEN_FOR_MEMBERS', 'MEMBERSHIP_REVIEW') THEN
        RAISE EXCEPTION 'Integrity Violation: Cannot delete member from Adashi group in locked/active status (Status: %). Use Member Exit workflow.', v_status;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prohibit_locked_member_deletion ON adashi.members;
CREATE TRIGGER trg_prohibit_locked_member_deletion
    BEFORE DELETE ON adashi.members
    FOR EACH ROW
    EXECUTE FUNCTION adashi.prohibit_locked_member_deletion();

-- 8.2 Prevent Mutation of Published Allocations
CREATE OR REPLACE FUNCTION adashi.prohibit_published_allocation_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'PUBLISHED' THEN
        RAISE EXCEPTION 'Integrity Violation: Published Adashi allocations are strictly immutable. Use Rotation Change Request workflow.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prohibit_published_alloc_mutation ON adashi.allocations;
CREATE TRIGGER trg_prohibit_published_alloc_mutation
    BEFORE UPDATE OR DELETE ON adashi.allocations
    FOR EACH ROW
    EXECUTE FUNCTION adashi.prohibit_published_allocation_mutation();

-- 8.3 Prohibit Mutation of Immutable Audit Logs
CREATE OR REPLACE FUNCTION liquidity.prohibit_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Financial Audit Violation: Audit logs are strictly immutable and append-only.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prohibit_liq_audit_mutation ON liquidity.audit_logs;
CREATE TRIGGER trg_prohibit_liq_audit_mutation
    BEFORE UPDATE OR DELETE ON liquidity.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION liquidity.prohibit_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_prohibit_adashi_audit_mutation ON adashi.audit_logs;
CREATE TRIGGER trg_prohibit_adashi_audit_mutation
    BEFORE UPDATE OR DELETE ON adashi.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION liquidity.prohibit_audit_log_mutation();

-- =============================================================================
-- SECTION 9: REPORTING & DASHBOARD VIEWS
-- =============================================================================

-- 9.1 Adashi Dashboard View
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

-- 9.2 Central Liquidity Dashboard View (Strict Currency Segregation)
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
    (pos.available) AS available_after_adashi_reservations,
    pos.last_calculated_at AS last_snapshot_at
FROM liquidity.pools p
JOIN liquidity.positions pos ON pos.pool_id = p.id
LEFT JOIN liquidity.reservations r ON r.pool_id = p.id AND r.status = 'ACTIVE'
GROUP BY p.country_code, p.legal_entity_code, p.id, p.pool_code, p.currency, pos.current_confirmed, pos.available, pos.reserved, pos.restricted, pos.pending_settlement, pos.in_transit, pos.expected_inflow, pos.committed_outflow, pos.projected, pos.last_calculated_at;

-- =============================================================================
-- SECTION 10: ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE adashi.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE adashi.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE adashi.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE adashi.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE adashi.contribution_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE adashi.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE adashi.defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE adashi.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity.pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity.movements ENABLE ROW LEVEL SECURITY;

-- Service Role Policy (Unrestricted Server Backend Access)
CREATE POLICY "service_role_adashi_all" ON adashi.groups FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_adashi_members" ON adashi.members FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_adashi_obligations" ON adashi.contribution_obligations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_adashi_payouts" ON adashi.payouts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_liquidity_pools" ON liquidity.pools FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_liquidity_positions" ON liquidity.positions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_liquidity_reservations" ON liquidity.reservations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_liquidity_movements" ON liquidity.movements FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated Users Read Policies (Scoped to Tenant/Customer)
CREATE POLICY "auth_read_adashi_products" ON adashi.products FOR SELECT TO authenticated USING (status = 'ACTIVE');
CREATE POLICY "auth_read_adashi_groups" ON adashi.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_adashi_members" ON adashi.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_adashi_cycles" ON adashi.cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_adashi_obligations" ON adashi.contribution_obligations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_adashi_payouts" ON adashi.payouts FOR SELECT TO authenticated USING (true);

COMMIT;
