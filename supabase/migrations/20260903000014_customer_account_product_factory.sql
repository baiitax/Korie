-- Migration: 20260903000014_customer_account_product_factory.sql
-- Description: Customer Master, Multi-Currency Account Lifecycle & Configurable Banking Product Factory

-- ============================================================================
-- 1. CUSTOMER MASTER & LIFECYCLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(32) UNIQUE NOT NULL, -- e.g. CUST-NG-009182
    tenant_id UUID NOT NULL,
    identity_record_id VARCHAR(64), -- FK to Master Identity Record
    full_name VARCHAR(128) NOT NULL,
    email VARCHAR(128) UNIQUE NOT NULL,
    phone VARCHAR(32) UNIQUE NOT NULL,
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE')),
    customer_type VARCHAR(16) NOT NULL DEFAULT 'PERSONAL' CHECK (customer_type IN (
        'PERSONAL', 'PREMIUM', 'SME', 'CORPORATE', 'AGENT', 'MERCHANT', 'BDC'
    )),
    
    -- Independent Customer Lifecycle Status
    status VARCHAR(32) NOT NULL DEFAULT 'APPLICATION_STARTED' CHECK (status IN (
        'PROSPECT', 'APPLICATION_STARTED', 'APPLICATION_SUBMITTED', 'KYC_PENDING',
        'KYC_IN_REVIEW', 'KYC_VERIFIED', 'ACCOUNT_OPENING', 'ACTIVE',
        'RESTRICTED', 'SUSPENDED', 'DORMANT', 'FROZEN', 'CLOSURE_PENDING', 'CLOSED'
    )),
    
    kyc_tier VARCHAR(16) NOT NULL DEFAULT 'TIER_1' CHECK (kyc_tier IN ('TIER_1', 'TIER_2', 'TIER_3')),
    risk_status VARCHAR(16) NOT NULL DEFAULT 'LOW' CHECK (risk_status IN ('LOW', 'ELEVATED', 'HIGH', 'CRITICAL')),
    risk_score NUMERIC(5, 2) DEFAULT 10.00,
    
    date_of_birth DATE,
    residential_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS customer_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer_records(id) ON DELETE CASCADE,
    previous_status VARCHAR(32) NOT NULL,
    new_status VARCHAR(32) NOT NULL,
    reason_code VARCHAR(64) NOT NULL,
    notes TEXT,
    actor_email VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. BANKING PRODUCT FACTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS banking_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. KORIE_WALLET_NGN_BASIC
    name VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    product_type VARCHAR(32) NOT NULL CHECK (product_type IN (
        'CONSUMER_WALLET', 'SAVINGS', 'CURRENT', 'MERCHANT_SETTLEMENT', 'AGENCY_FLOAT', 'BDC_TREASURY'
    )),
    customer_type VARCHAR(16) NOT NULL CHECK (customer_type IN (
        'PERSONAL', 'PREMIUM', 'SME', 'CORPORATE', 'AGENT', 'MERCHANT', 'BDC'
    )),
    jurisdiction VARCHAR(16) NOT NULL CHECK (jurisdiction IN ('NG', 'NE', 'CROSS_BORDER')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'DEPRECATED', 'RETIRED'
    )),
    version INTEGER NOT NULL DEFAULT 1,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    
    -- Eligibility Requirements
    min_kyc_tier VARCHAR(16) NOT NULL DEFAULT 'TIER_1',
    max_risk_score NUMERIC(5, 2) DEFAULT 70.00,
    allowed_channels TEXT[] DEFAULT ARRAY['NIP', 'CARD', 'VIRTUAL_ACCOUNT', 'USSD'],
    
    -- Core Ledger Mappings
    gl_asset_pool_code VARCHAR(16) NOT NULL DEFAULT '1010',
    gl_liability_wallet_code VARCHAR(16) NOT NULL DEFAULT '2010',
    gl_fee_revenue_code VARCHAR(16) NOT NULL DEFAULT '4010',
    
    -- Limits
    single_transaction_limit NUMERIC(18, 4) NOT NULL DEFAULT 50000,
    daily_transaction_limit NUMERIC(18, 4) NOT NULL DEFAULT 300000,
    max_balance_cap NUMERIC(18, 4) NOT NULL DEFAULT 300000,
    
    created_by VARCHAR(128) NOT NULL,
    approved_by VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES banking_products(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    changes_summary TEXT NOT NULL,
    snapshot_config JSONB NOT NULL,
    created_by VARCHAR(128) NOT NULL,
    approved_by VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. CUSTOMER ACCOUNTS (FINANCIAL HOLDINGS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_number VARCHAR(32) UNIQUE NOT NULL, -- NUBAN / Virtual Account Number
    account_name VARCHAR(128) NOT NULL,
    customer_id UUID NOT NULL REFERENCES customer_records(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES banking_products(id),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE')),
    
    -- Independent Account Lifecycle Status
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN (
        'APPLICATION', 'PENDING_APPROVAL', 'OPENING', 'OPEN',
        'RESTRICTED', 'FROZEN', 'DORMANT', 'CLOSURE_PENDING', 'CLOSED'
    )),
    
    -- Subledger Linkage (Authoritative balance is in GL Subledger)
    subledger_id UUID,
    
    -- Bank Virtual Account Details
    assigned_bank_name VARCHAR(64) DEFAULT 'Providus Bank',
    assigned_bank_code VARCHAR(16) DEFAULT '058',
    
    is_primary BOOLEAN DEFAULT TRUE,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_account_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    restriction_type VARCHAR(32) NOT NULL CHECK (restriction_type IN (
        'DEBIT_ONLY', 'CREDIT_ONLY', 'TRANSFER_DISABLED', 'WITHDRAWAL_DISABLED',
        'BENEFICIARY_DISABLED', 'DEVICE_RESTRICTED', 'FULL_FREEZE'
    )),
    reason_code VARCHAR(64) NOT NULL,
    notes TEXT,
    applied_by VARCHAR(128) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lifted_at TIMESTAMPTZ,
    lifted_by VARCHAR(128)
);

-- ============================================================================
-- 4. BENEFICIARY SECURITY & MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer_records(id) ON DELETE CASCADE,
    beneficiary_name VARCHAR(128) NOT NULL,
    account_number VARCHAR(32) NOT NULL,
    bank_code VARCHAR(16) NOT NULL,
    bank_name VARCHAR(64) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    country VARCHAR(2) NOT NULL,
    
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
        'ADDED', 'VERIFICATION_PENDING', 'COOLDOWN', 'ACTIVE', 'BLOCKED', 'DEACTIVATED'
    )),
    
    is_verified BOOLEAN DEFAULT TRUE,
    cooldown_expires_at TIMESTAMPTZ,
    risk_score NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. ACCOUNT RECOVERY CASES
-- ============================================================================

CREATE TABLE IF NOT EXISTS account_recovery_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recovery_reference VARCHAR(64) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customer_records(id),
    recovery_type VARCHAR(32) NOT NULL CHECK (recovery_type IN (
        'LOST_DEVICE', 'SIM_SWAP', 'PASSWORD_RESET', 'COMPROMISED_ACCOUNT'
    )),
    status VARCHAR(32) NOT NULL DEFAULT 'INITIATED' CHECK (status IN (
        'INITIATED', 'IDENTITY_VERIFIED', 'SECURITY_REVIEW', 'APPROVED', 'COMPLETED', 'REJECTED'
    )),
    requested_by_ip VARCHAR(45),
    notes TEXT,
    assigned_analyst VARCHAR(128),
    approved_by VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for Ultra-High Performance Customer & Product Queries
CREATE INDEX IF NOT EXISTS idx_customer_records_email ON customer_records(email);
CREATE INDEX IF NOT EXISTS idx_customer_records_phone ON customer_records(phone);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_cust ON customer_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_accnum ON customer_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_banking_products_code ON banking_products(product_code);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_customer ON beneficiaries(customer_id);
