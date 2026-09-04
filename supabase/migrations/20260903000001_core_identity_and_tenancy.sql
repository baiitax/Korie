-- ==============================================================================
-- KORIEPAY TIER-1 FINANCIAL PLATFORM: CORE IDENTITY, TENANCY & IAM
-- Migration: 20260903000001_core_identity_and_tenancy.sql
-- ==============================================================================

-- Enable required cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations (Tenants)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    country VARCHAR(16) NOT NULL CHECK (country IN ('NG', 'NE', 'CROSS_BORDER')),
    jurisdiction VARCHAR(64) NOT NULL DEFAULT 'Bilateral WAEMU',
    business_type VARCHAR(64) NOT NULL CHECK (business_type IN ('FINTECH', 'MERCHANT', 'AGGREGATOR', 'BANK', 'ENTERPRISE')),
    tier VARCHAR(32) NOT NULL DEFAULT 'TIER_1' CHECK (tier IN ('TIER_1', 'TIER_2', 'TIER_3', 'ENTERPRISE')),
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'TIER_1', 'VERIFIED', 'REJECTED')),
    default_currency VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (default_currency IN ('NGN', 'XOF', 'USD')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_country ON public.organizations(country);

-- 2. User Profiles & Organization Membership
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE, -- Foreign key to supabase auth.users if auth is used
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    country VARCHAR(16) NOT NULL DEFAULT 'NG',
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enforced_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INVITED', 'DEACTIVATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 3. Roles & Permissions
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(128) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_user ON public.organization_members(org_id, user_id);

-- 4. Device Trust & Sessions
CREATE TABLE IF NOT EXISTS public.device_trust (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(64) NOT NULL,
    is_trusted BOOLEAN NOT NULL DEFAULT FALSE,
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed System Default Roles
INSERT INTO public.roles (name, description, is_system_role)
VALUES 
  ('SUPER_ADMIN', 'Platform-wide administrator with dual-control authorization requirements', TRUE),
  ('ORGANIZATION_OWNER', 'Full management access to organization financial & API assets', TRUE),
  ('ORGANIZATION_ADMIN', 'Administrative access excluding settlement account manipulation', TRUE),
  ('DEVELOPER', 'API key management, webhook setup, and sandbox testing', TRUE),
  ('FINANCE_OFFICER', 'Reconciliation, reporting and maker-checker settlement reviews', TRUE),
  ('COMPLIANCE_OFFICER', 'AML/KYC screening, sanction reviews and SAR filings', TRUE),
  ('SUPPORT_OFFICER', 'Frontline customer assistance with strict zero-mutation boundaries', TRUE)
ON CONFLICT (name) DO NOTHING;
