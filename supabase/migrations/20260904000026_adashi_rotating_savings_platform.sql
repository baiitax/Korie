-- =============================================================================
-- Migration: 20260904000026_adashi_rotating_savings_platform.sql
-- Description: P0 Enterprise Adashi / Ajo / Rotating Savings (ROSCA) Engine
-- Author: KoriePay Core Architecture Team
-- Multi-Jurisdiction: Nigeria (NGN) & Niger Republic (XOF)
-- =============================================================================

-- 1. ADASHI PRODUCT TEMPLATES
CREATE TABLE IF NOT EXISTS adashi_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(64) UNIQUE NOT NULL,
    product_name VARCHAR(128) NOT NULL,
    description TEXT,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    country_code VARCHAR(2) NOT NULL CHECK (country_code IN ('NG', 'NE')),
    cadence VARCHAR(16) NOT NULL CHECK (cadence IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY')),
    min_members INT NOT NULL DEFAULT 3,
    max_members INT NOT NULL DEFAULT 50,
    contribution_amount NUMERIC(15, 2) NOT NULL CHECK (contribution_amount > 0),
    platform_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (platform_fee_percent >= 0),
    agent_commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.50 CHECK (agent_commission_percent >= 0),
    grace_period_hours INT NOT NULL DEFAULT 48,
    max_overdue_days INT NOT NULL DEFAULT 7,
    allow_partial_payouts BOOLEAN NOT NULL DEFAULT FALSE,
    requires_maker_checker_payout BOOLEAN NOT NULL DEFAULT TRUE,
    payout_maker_checker_threshold NUMERIC(15, 2) NOT NULL DEFAULT 500000.00,
    version INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ADASHI GROUPS
CREATE TABLE IF NOT EXISTS adashi_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_code VARCHAR(64) UNIQUE NOT NULL,
    group_name VARCHAR(128) NOT NULL,
    product_id UUID NOT NULL REFERENCES adashi_products(id),
    creator_id UUID NOT NULL,
    creator_role VARCHAR(32) NOT NULL CHECK (creator_role IN ('AGENT', 'CUSTOMER', 'ADMIN')),
    assigned_agent_id UUID,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    country_code VARCHAR(2) NOT NULL CHECK (country_code IN ('NG', 'NE')),
    cadence VARCHAR(16) NOT NULL CHECK (cadence IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY')),
    contribution_amount NUMERIC(15, 2) NOT NULL,
    target_members INT NOT NULL,
    current_members_count INT NOT NULL DEFAULT 0,
    total_cycles INT NOT NULL,
    current_cycle_number INT NOT NULL DEFAULT 0,
    total_pool_volume NUMERIC(15, 2) NOT NULL DEFAULT 0,
    escrow_vault_account_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',
        'INVITING_MEMBERS',
        'MEMBERSHIP_LOCKED',
        'ROTATION_PUBLISHED',
        'ACTIVE_IN_PROGRESS',
        'COMPLETED',
        'FROZEN',
        'CANCELLED'
    )),
    locked_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ADASHI GROUP MEMBERS & CONSENT
CREATE TABLE IF NOT EXISTS adashi_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adashi_id UUID NOT NULL REFERENCES adashi_groups(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    customer_name VARCHAR(128) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_email VARCHAR(128),
    kyc_tier INT NOT NULL DEFAULT 1,
    assigned_position INT,
    status VARCHAR(32) NOT NULL DEFAULT 'INVITED' CHECK (status IN (
        'INVITED',
        'CONSENT_ACCEPTED',
        'CONSENT_REJECTED',
        'ACTIVE',
        'DEFAULTED',
        'REPLACED',
        'COMPLETED'
    )),
    mandate_authorized BOOLEAN NOT NULL DEFAULT FALSE,
    mandate_authorization_date TIMESTAMPTZ,
    total_contributed_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_payout_received NUMERIC(15, 2) NOT NULL DEFAULT 0,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(adashi_id, customer_id),
    UNIQUE(adashi_id, assigned_position)
);

-- 4. ADASHI ROTATIONS (Cryptographic verifiable order)
CREATE TABLE IF NOT EXISTS adashi_rotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adashi_id UUID NOT NULL REFERENCES adashi_groups(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    algorithm VARCHAR(64) NOT NULL DEFAULT 'HMAC_SHA256_DETERMINISTIC',
    seed_hash VARCHAR(128) NOT NULL,
    fairness_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    status VARCHAR(32) NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'PUBLISHED', 'AMENDED', 'SUPERSEDED')),
    published_by UUID NOT NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ADASHI CYCLES
CREATE TABLE IF NOT EXISTS adashi_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adashi_id UUID NOT NULL REFERENCES adashi_groups(id) ON DELETE CASCADE,
    cycle_number INT NOT NULL,
    beneficiary_member_id UUID NOT NULL REFERENCES adashi_group_members(id),
    beneficiary_customer_id UUID NOT NULL,
    beneficiary_name VARCHAR(128) NOT NULL,
    cycle_start_date TIMESTAMPTZ NOT NULL,
    cycle_due_date TIMESTAMPTZ NOT NULL,
    grace_deadline TIMESTAMPTZ NOT NULL,
    expected_collection_amount NUMERIC(15, 2) NOT NULL,
    actual_collected_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    gross_payout_amount NUMERIC(15, 2) NOT NULL,
    platform_fee_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    agent_commission_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    net_payout_amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN (
        'SCHEDULED',
        'CONTRIBUTION_OPEN',
        'COLLECTION_IN_PROGRESS',
        'COLLECTION_COMPLETED',
        'PAYOUT_PENDING_APPROVAL',
        'PAYOUT_PROCESSING',
        'PAYOUT_COMPLETED',
        'DEFAULT_ARREARS',
        'CLOSED'
    )),
    payout_reference VARCHAR(64),
    payout_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(adashi_id, cycle_number)
);

-- 6. ADASHI CONTRIBUTION OBLIGATIONS (One per member per cycle)
CREATE TABLE IF NOT EXISTS adashi_contribution_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adashi_id UUID NOT NULL REFERENCES adashi_groups(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES adashi_cycles(id) ON DELETE CASCADE,
    cycle_number INT NOT NULL,
    member_id UUID NOT NULL REFERENCES adashi_group_members(id),
    customer_id UUID NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    due_date TIMESTAMPTZ NOT NULL,
    grace_deadline TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN (
        'SCHEDULED',
        'PENDING_AUTO_DEBIT',
        'PAID',
        'FAILED',
        'UNKNOWN',
        'GRACE_PERIOD',
        'OVERDUE',
        'DEFAULTED',
        'WAIVED'
    )),
    retry_count INT NOT NULL DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(32) DEFAULT 'WALLET_AUTO_DEBIT',
    ledger_journal_id VARCHAR(64),
    payment_reference VARCHAR(64),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ADASHI PAYOUTS & DISBURSEMENTS
CREATE TABLE IF NOT EXISTS adashi_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adashi_id UUID NOT NULL REFERENCES adashi_groups(id),
    cycle_id UUID NOT NULL REFERENCES adashi_cycles(id),
    beneficiary_customer_id UUID NOT NULL,
    gross_amount NUMERIC(15, 2) NOT NULL,
    platform_fee NUMERIC(15, 2) NOT NULL DEFAULT 0,
    agent_commission NUMERIC(15, 2) NOT NULL DEFAULT 0,
    net_disbursed_amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    destination_type VARCHAR(32) NOT NULL DEFAULT 'KORIEPAY_WALLET' CHECK (destination_type IN ('KORIEPAY_WALLET', 'BANK_ACCOUNT', 'MOBILE_MONEY')),
    destination_account_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_AUTHORIZATION' CHECK (status IN (
        'PENDING_AUTHORIZATION',
        'AUTHORIZED',
        'DISPATCHED_TO_SWITCH',
        'COMPLETED',
        'FAILED',
        'REVERSED'
    )),
    requires_maker_checker BOOLEAN NOT NULL DEFAULT TRUE,
    maker_id UUID NOT NULL,
    checker_id UUID,
    maker_checker_request_id UUID,
    ledger_journal_id VARCHAR(64),
    payment_reference VARCHAR(64) UNIQUE,
    error_reason TEXT,
    disbursed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. ADASHI DEFAULT RECOVERY CASES
CREATE TABLE IF NOT EXISTS adashi_recovery_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(64) UNIQUE NOT NULL,
    adashi_id UUID NOT NULL REFERENCES adashi_groups(id),
    cycle_id UUID NOT NULL REFERENCES adashi_cycles(id),
    obligation_id UUID NOT NULL REFERENCES adashi_contribution_obligations(id),
    defaulted_customer_id UUID NOT NULL,
    defaulted_customer_name VARCHAR(128) NOT NULL,
    assigned_agent_id UUID,
    outstanding_amount NUMERIC(15, 2) NOT NULL,
    recovered_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    stage VARCHAR(32) NOT NULL DEFAULT 'GRACE_OVERDUE' CHECK (stage IN (
        'GRACE_OVERDUE',
        'AGENT_MEDIATION',
        'AUTO_WALLET_LIEN',
        'LEGAL_RECOVERY',
        'GUARANTEE_CLAIMED',
        'SETTLED',
        'WRITTEN_OFF'
    )),
    notes TEXT,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ADASHI MAKER-CHECKER WORKFLOWS
CREATE TABLE IF NOT EXISTS adashi_maker_checker_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(64) NOT NULL CHECK (request_type IN (
        'HIGH_VALUE_PAYOUT',
        'ROTATION_OVERRIDE',
        'DEFAULT_WRITE_OFF',
        'PRODUCT_DEPRECATION',
        'EMERGENCY_FREEZE',
        'MEMBER_SUBSTITUTION'
    )),
    entity_id VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    maker_id UUID NOT NULL,
    maker_name VARCHAR(128) NOT NULL,
    maker_role VARCHAR(64) NOT NULL,
    checker_id UUID,
    checker_name VARCHAR(128),
    checker_role VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
    maker_notes TEXT NOT NULL,
    checker_notes TEXT,
    payload_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actioned_at TIMESTAMPTZ
);

-- 10. ADASHI AUDIT EVENTS (Immutable)
CREATE TABLE IF NOT EXISTS adashi_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL,
    adashi_id UUID REFERENCES adashi_groups(id) ON DELETE SET NULL,
    actor_id UUID NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    details JSONB NOT NULL,
    ip_address VARCHAR(45),
    correlation_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_adashi_groups_status ON adashi_groups(status);
CREATE INDEX IF NOT EXISTS idx_adashi_groups_currency ON adashi_groups(currency);
CREATE INDEX IF NOT EXISTS idx_adashi_groups_agent ON adashi_groups(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_adashi_group_members_adashi ON adashi_group_members(adashi_id);
CREATE INDEX IF NOT EXISTS idx_adashi_group_members_customer ON adashi_group_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_adashi_cycles_adashi ON adashi_cycles(adashi_id);
CREATE INDEX IF NOT EXISTS idx_adashi_cycles_status ON adashi_cycles(status);
CREATE INDEX IF NOT EXISTS idx_adashi_obligations_cycle ON adashi_contribution_obligations(cycle_id);
CREATE INDEX IF NOT EXISTS idx_adashi_obligations_status ON adashi_contribution_obligations(status);
CREATE INDEX IF NOT EXISTS idx_adashi_obligations_member ON adashi_contribution_obligations(member_id);
CREATE INDEX IF NOT EXISTS idx_adashi_payouts_adashi ON adashi_payouts(adashi_id);
CREATE INDEX IF NOT EXISTS idx_adashi_recovery_status ON adashi_recovery_cases(stage);
CREATE INDEX IF NOT EXISTS idx_adashi_maker_checker_status ON adashi_maker_checker_requests(status);

-- SEED FOUNDATIONAL PRODUCTS
INSERT INTO adashi_products (product_code, product_name, description, currency, country_code, cadence, min_members, max_members, contribution_amount, platform_fee_percent, agent_commission_percent, grace_period_hours, requires_maker_checker_payout, payout_maker_checker_threshold)
VALUES
('ADA-NGN-WK-10K', 'Weekly Market Trader Circle (NGN)', 'High-turnover weekly rotating savings for verified merchants in Lagos & Abuja markets', 'NGN', 'NG', 'WEEKLY', 5, 20, 10000.00, 1.00, 0.50, 48, TRUE, 200000.00),
('ADA-NGN-MO-50K', 'Monthly Executive Builder (NGN)', 'Structured monthly savings pool for verified salary earners and enterprise entrepreneurs', 'NGN', 'NG', 'MONTHLY', 5, 12, 50000.00, 1.50, 0.50, 72, TRUE, 500000.00),
('ADA-XOF-WK-10K', 'Cercle Tontine Hebdo Niamey (XOF)', 'Rotating micro-savings collective for merchants in Grand Marché de Niamey', 'XOF', 'NE', 'WEEKLY', 5, 20, 10000.00, 1.00, 0.50, 48, TRUE, 200000.00),
('ADA-XOF-MO-25K', 'Tontine Mensuelle Solidarité (XOF)', 'Monthly cooperative savings for verified artisan associations across Niger', 'XOF', 'NE', 'MONTHLY', 4, 10, 25000.00, 1.25, 0.50, 72, TRUE, 250000.00)
ON CONFLICT (product_code) DO NOTHING;
