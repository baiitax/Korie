-- Migration: 20260903000011_identity_kyc_and_disaster_recovery.sql
-- Description: Master Identity / KYC Platform and Disaster Recovery / Operational Resilience Architecture for KoriePay (NGN / XOF)

-- 1. MASTER IDENTITY: PERSONS
CREATE TABLE IF NOT EXISTS public.identity_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. KID-NG-884210, KID-NE-102938
    first_name VARCHAR(128) NOT NULL,
    middle_name VARCHAR(128),
    last_name VARCHAR(128) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(16),
    nationality VARCHAR(64) NOT NULL DEFAULT 'Nigerian',
    country_code VARCHAR(2) NOT NULL DEFAULT 'NG',
    phone_primary VARCHAR(32) NOT NULL,
    email_primary VARCHAR(255) NOT NULL,
    kyc_tier VARCHAR(16) NOT NULL DEFAULT 'TIER_0', -- TIER_0, TIER_1, TIER_2, TIER_3
    kyc_status VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, SUBMITTED, UNDER_REVIEW, VERIFIED, VERIFIED_WITH_LIMITATIONS, REJECTED, EXPIRED, REVERIFICATION_REQUIRED
    identity_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- PENDING, ACTIVE, RESTRICTED, SUSPENDED, LOCKED, DEACTIVATED, CLOSED, DUPLICATE
    risk_level VARCHAR(16) NOT NULL DEFAULT 'LOW', -- VERY_LOW, LOW, MEDIUM, HIGH, CRITICAL
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_persons_ref ON public.identity_persons(identity_reference);
CREATE INDEX IF NOT EXISTS idx_identity_persons_email ON public.identity_persons(email_primary);
CREATE INDEX IF NOT EXISTS idx_identity_persons_phone ON public.identity_persons(phone_primary);

-- 2. MASTER IDENTITY: ORGANIZATIONS (BUSINESSES / MERCHANTS / AGGREGATORS)
CREATE TABLE IF NOT EXISTS public.identity_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. KID-ORG-990142
    legal_name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    registration_number VARCHAR(128) NOT NULL, -- CAC RC Number (NG) or RCCM (NE)
    tax_identifier VARCHAR(128), -- TIN / NIF
    country_code VARCHAR(2) NOT NULL DEFAULT 'NG',
    business_type VARCHAR(64) NOT NULL DEFAULT 'LIMITED_COMPANY',
    industry VARCHAR(128),
    registered_address TEXT NOT NULL,
    operating_address TEXT,
    kyb_status VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, SUBMITTED, UNDER_REVIEW, VERIFIED, CONDITIONAL, REJECTED, EXPIRED
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    risk_level VARCHAR(16) NOT NULL DEFAULT 'LOW',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_orgs_ref ON public.identity_organizations(identity_reference);
CREATE INDEX IF NOT EXISTS idx_identity_orgs_reg ON public.identity_organizations(registration_number);

-- 3. BENEFICIAL OWNERSHIP & DIRECTORS (>25% THRESHOLD)
CREATE TABLE IF NOT EXISTS public.identity_beneficial_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.identity_organizations(id) ON DELETE CASCADE,
    person_identity_id UUID REFERENCES public.identity_persons(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL DEFAULT 'DIRECTOR', -- DIRECTOR, SHAREHOLDER, BENEFICIAL_OWNER, AUTHORIZED_SIGNATORY
    ownership_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (ownership_percentage BETWEEN 0 AND 100),
    is_pep BOOLEAN NOT NULL DEFAULT FALSE,
    national_id_masked VARCHAR(64),
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. VERIFICATION EVIDENCE LOG (IMMUTABLE HASHED PROOF)
CREATE TABLE IF NOT EXISTS public.identity_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID NOT NULL, -- Person or Organization ID
    identity_type VARCHAR(32) NOT NULL DEFAULT 'PERSON',
    provider_code VARCHAR(64) NOT NULL, -- NIMC_NIN, NIBSS_BVN, CAC_REGISTRY, NIGER_NINA, ONFIDO_BIOMETRIC
    provider_reference VARCHAR(128) NOT NULL,
    verification_type VARCHAR(64) NOT NULL, -- NATIONAL_ID, BVN, BIOMETRIC, CAC, ADDRESS
    confidence_score INT NOT NULL DEFAULT 100 CHECK (confidence_score BETWEEN 0 AND 100),
    status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED',
    evidence_sha256_hash VARCHAR(64) NOT NULL,
    provider_response_raw JSONB NOT NULL DEFAULT '{}'::jsonb,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_verifs_id ON public.identity_verifications(identity_id);

-- 5. SECURE DOCUMENT VAULT METADATA
CREATE TABLE IF NOT EXISTS public.identity_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID NOT NULL,
    document_type VARCHAR(64) NOT NULL, -- PASSPORT, NATIONAL_ID, DRIVERS_LICENSE, CAC_CERT, UTILITY_BILL
    document_number_masked VARCHAR(64),
    file_sha256_hash VARCHAR(64) NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_path_encrypted TEXT NOT NULL,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    expires_at DATE,
    uploaded_by VARCHAR(128) NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. DISASTER RECOVERY: CIRCUIT BREAKER STATES
CREATE TABLE IF NOT EXISTS public.circuit_breaker_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_key VARCHAR(64) UNIQUE NOT NULL, -- e.g. PROVIDUS_BANK_NG, KORIS_BANK_NE, NIMC_GATEWAY
    service_name VARCHAR(128) NOT NULL,
    tier VARCHAR(16) NOT NULL DEFAULT 'TIER_1', -- TIER_0, TIER_1, TIER_2, TIER_3
    state VARCHAR(16) NOT NULL DEFAULT 'CLOSED', -- CLOSED, OPEN, HALF_OPEN
    failure_count INT NOT NULL DEFAULT 0,
    failure_threshold INT NOT NULL DEFAULT 5,
    last_failure_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    trip_reason TEXT,
    cool_off_seconds INT NOT NULL DEFAULT 60,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. DISASTER RECOVERY: DEAD-LETTER QUEUE
CREATE TABLE IF NOT EXISTS public.dead_letter_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_key VARCHAR(128) NOT NULL,
    queue_name VARCHAR(64) NOT NULL,
    payload_json JSONB NOT NULL,
    error_message TEXT NOT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 5,
    status VARCHAR(32) NOT NULL DEFAULT 'FAILED', -- FAILED, REPLAYED, DISCARDED
    replayed_at TIMESTAMPTZ,
    replayed_by VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. DISASTER RECOVERY: FINANCIAL SAFE MODE & INCIDENT RECORDS
CREATE TABLE IF NOT EXISTS public.safe_mode_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    activation_reason TEXT NOT NULL,
    activated_by VARCHAR(128) NOT NULL,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deactivated_at TIMESTAMPTZ,
    deactivated_by VARCHAR(128)
);

CREATE TABLE IF NOT EXISTS public.incident_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. INC-20260903-01
    severity VARCHAR(16) NOT NULL DEFAULT 'SEV_2', -- SEV_1, SEV_2, SEV_3, SEV_4
    title VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'INVESTIGATING', -- INVESTIGATING, CONTAINED, MITIGATED, RESOLVED, CLOSED
    impacted_services JSONB NOT NULL DEFAULT '[]'::jsonb,
    incident_commander VARCHAR(128) NOT NULL,
    root_cause TEXT,
    resolution_notes TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    contained_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);
