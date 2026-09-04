-- Migration: 20260904000016_enterprise_iam_pam_and_soc.sql
-- Description: Enterprise IAM, Privileged Access Management (PAM), SIEM & SOC Security Control Plane

-- ============================================================================
-- 1. WORKFORCE IDENTITIES & ACCESS GOVERNANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workforce_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(64) NOT NULL,
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE', 'GLOBAL')),
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (lifecycle_status IN (
        'INVITED', 'PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'RESTRICTED', 'OFFBOARDED', 'DELETED_REFERENCE_ONLY'
    )),
    mfa_enforced BOOLEAN NOT NULL DEFAULT TRUE,
    mfa_method VARCHAR(32) NOT NULL DEFAULT 'TOTP_AND_WEBAUTHN',
    current_aal VARCHAR(8) NOT NULL DEFAULT 'AAL2' CHECK (current_aal IN ('AAL1', 'AAL2', 'AAL3')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workforce_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. TREASURY_MANAGER, MLRO
    role_name VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    is_privileged BOOLEAN NOT NULL DEFAULT FALSE,
    requires_maker_checker BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workforce_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_code VARCHAR(128) UNIQUE NOT NULL, -- e.g. settlement:approve:NG
    resource_type VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    scope VARCHAR(64) NOT NULL DEFAULT 'ALL',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workforce_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES workforce_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES workforce_permissions(id) ON DELETE CASCADE,
    CONSTRAINT uq_role_perm UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS workforce_identity_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID NOT NULL REFERENCES workforce_identities(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES workforce_roles(id) ON DELETE CASCADE,
    assigned_by VARCHAR(128) NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_identity_role UNIQUE (identity_id, role_id)
);

-- ============================================================================
-- 2. SESSIONS, DEVICE TRUST & PRIVILEGED ACCESS MANAGEMENT (PAM)
-- ============================================================================

CREATE TABLE IF NOT EXISTS iam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token_hash VARCHAR(128) UNIQUE NOT NULL,
    identity_id UUID NOT NULL REFERENCES workforce_identities(id) ON DELETE CASCADE,
    aal_level VARCHAR(8) NOT NULL DEFAULT 'AAL2' CHECK (aal_level IN ('AAL1', 'AAL2', 'AAL3')),
    device_id VARCHAR(128) NOT NULL,
    device_platform VARCHAR(64) NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    country_code VARCHAR(2) NOT NULL DEFAULT 'NG',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,
    revocation_reason VARCHAR(128),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iam_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(128) UNIQUE NOT NULL,
    identity_id UUID NOT NULL REFERENCES workforce_identities(id) ON DELETE CASCADE,
    platform VARCHAR(64) NOT NULL,
    hardware_fingerprint VARCHAR(128) NOT NULL,
    trust_status VARCHAR(32) NOT NULL DEFAULT 'TRUSTED' CHECK (trust_status IN (
        'UNKNOWN', 'PENDING', 'TRUSTED', 'RESTRICTED', 'BLOCKED', 'RETIRED'
    )),
    posture_score NUMERIC(5, 2) NOT NULL DEFAULT 95.00,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iam_privileged_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. JIT-2026-0041
    requester_email VARCHAR(128) NOT NULL,
    target_role_code VARCHAR(64) NOT NULL,
    justification TEXT NOT NULL,
    change_ticket_ref VARCHAR(64) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED'
    )),
    checker_email VARCHAR(128),
    decided_at TIMESTAMPTZ,
    lease_starts_at TIMESTAMPTZ,
    lease_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iam_break_glass_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_ref VARCHAR(64) NOT NULL,
    actor_email VARCHAR(128) NOT NULL,
    justification TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    aal_used VARCHAR(8) NOT NULL DEFAULT 'AAL3',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by VARCHAR(128)
);

-- ============================================================================
-- 3. SECURITY OPERATIONS CENTER (SOC) & SIEM EVENT PIPELINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL, -- e.g. LOGIN_SUCCESS, PRIVILEGE_ELEVATION, RLS_DENIAL
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    actor_id VARCHAR(128) NOT NULL,
    actor_type VARCHAR(32) NOT NULL DEFAULT 'WORKFORCE',
    session_id VARCHAR(128),
    device_id VARCHAR(128),
    ip_address VARCHAR(64) NOT NULL,
    country_code VARCHAR(2) NOT NULL DEFAULT 'NG',
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128) NOT NULL,
    action VARCHAR(64) NOT NULL,
    result VARCHAR(32) NOT NULL CHECK (result IN ('SUCCESS', 'DENIED', 'CHALLENGED', 'ABORTED')),
    reason TEXT,
    correlation_id VARCHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_code VARCHAR(64) NOT NULL, -- e.g. SEC-DET-01
    title VARCHAR(256) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(32) NOT NULL DEFAULT 'NEW' CHECK (status IN (
        'NEW', 'TRIAGED', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'FALSE_POSITIVE'
    )),
    target_identity VARCHAR(128) NOT NULL,
    summary TEXT NOT NULL,
    evidence_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    assigned_analyst VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. INC-SEC-2026-0012
    title VARCHAR(256) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(32) NOT NULL DEFAULT 'INVESTIGATING' CHECK (status IN (
        'DETECTED', 'TRIAGED', 'INVESTIGATING', 'CONTAINMENT', 'ERADICATION', 'RECOVERY', 'POST_INCIDENT_REVIEW', 'CLOSED'
    )),
    incident_commander VARCHAR(128) NOT NULL,
    affected_services TEXT[] DEFAULT ARRAY[]::TEXT[],
    affected_countries TEXT[] DEFAULT ARRAY[]::TEXT[],
    containment_state VARCHAR(64) NOT NULL DEFAULT 'NOT_CONTAINED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS security_incident_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
    author_email VARCHAR(128) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_action_journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_email VARCHAR(128) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    target_domain VARCHAR(64) NOT NULL,
    target_id VARCHAR(128) NOT NULL,
    justification TEXT NOT NULL,
    before_state JSONB,
    after_state JSONB,
    checker_email VARCHAR(128),
    result VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ultra-High Performance Indexes for Real-Time Security Operations
CREATE INDEX IF NOT EXISTS idx_security_events_sev_time ON security_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_actor ON security_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_iam_sessions_active ON iam_sessions(is_active, identity_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status, severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status, severity);
