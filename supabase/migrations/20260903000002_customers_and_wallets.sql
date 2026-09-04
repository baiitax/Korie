-- ==============================================================================
-- KORIEPAY TIER-1 FINANCIAL PLATFORM: CUSTOMERS, PROFILES & WALLETS
-- Migration: 20260903000002_customers_and_wallets.sql
-- ==============================================================================

-- 1. Centralized Customers Master
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX IF NOT EXISTS idx_customers_org_phone ON public.customers(org_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_org_email ON public.customers(org_id, email);
CREATE INDEX IF NOT EXISTS idx_customers_country ON public.customers(country);

-- 2. Customer KYC & Identity Verification Attributes
CREATE TABLE IF NOT EXISTS public.customer_verification_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    id_type VARCHAR(32) NOT NULL CHECK (id_type IN ('BVN', 'NIN', 'NIF', 'NNI', 'PASSPORT', 'DRIVERS_LICENSE', 'VOTERS_CARD')),
    id_number_encrypted TEXT NOT NULL,
    id_number_masked VARCHAR(64) NOT NULL,
    verification_source VARCHAR(64) NOT NULL, -- e.g. NIBSS, NIMC, CENTIF_NE
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'FAILED', 'MANUAL_REVIEW')),
    verification_reference VARCHAR(128),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_verification_cust ON public.customer_verification_status(customer_id);

-- 3. Multi-Currency Wallets (Connected to Underlying Double-Entry Ledger)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    ledger_account_id UUID, -- Bound to public.ledger_accounts in Migration 3
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    country VARCHAR(16) NOT NULL CHECK (country IN ('NG', 'NE', 'CROSS_BORDER')),
    balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0), -- Cached balance in minor units (kobo/cents)
    locked_balance BIGINT NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
    daily_limit BIGINT NOT NULL DEFAULT 50000000, -- e.g. ₦500,000.00
    daily_spent BIGINT NOT NULL DEFAULT 0 CHECK (daily_spent >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESTRICTED', 'FROZEN', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_org_currency ON public.wallets(org_id, currency);
CREATE INDEX IF NOT EXISTS idx_wallets_customer ON public.wallets(customer_id);

-- 4. Wallet Holds & Escrow Reservations
CREATE TABLE IF NOT EXISTS public.wallet_holds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    reason VARCHAR(255) NOT NULL,
    reference VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RELEASED', 'CAPTURED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_holds_wallet ON public.wallet_holds(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_holds_reference ON public.wallet_holds(reference);
