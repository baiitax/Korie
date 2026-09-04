-- Migration: 20260904000020_physical_cash_vault_till_cit_and_liquidity.sql
-- Description: Authoritative Physical Cash Truth Layer, Vault/Till, Cash-in-Transit (CIT) & Liquidity Operations Control Plane

-- ============================================================================
-- 1. CASH LOCATIONS & CONTAINERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS cash_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. LOC-VAULT-ABJ-01, LOC-TILL-GARBA-01
    name VARCHAR(255) NOT NULL,
    location_type VARCHAR(64) NOT NULL CHECK (location_type IN (
        'CENTRAL_VAULT', 'REGIONAL_VAULT', 'BRANCH_VAULT', 'CASH_CENTER',
        'BRANCH_TILL', 'AGENT_TILL', 'AGENT_SAFE', 'ATM_CASH_LOCATION',
        'CIT_VEHICLE', 'CIT_HUB', 'BANK_LOCATION', 'TEMPORARY_SECURED_LOCATION'
    )),
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    legal_entity VARCHAR(128) NOT NULL DEFAULT 'KoriePay Core Ltd',
    region VARCHAR(64) NOT NULL,
    state_or_province VARCHAR(64) NOT NULL,
    parent_location_id UUID REFERENCES cash_locations(id) ON DELETE SET NULL,
    custody_owner VARCHAR(128) NOT NULL, -- Custodian / Teller / Courier
    operational_owner VARCHAR(128) NOT NULL, -- Branch Manager / Super Agent
    risk_classification VARCHAR(16) NOT NULL DEFAULT 'LOW' CHECK (risk_classification IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESTRICTED', 'SUSPENDED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    container_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. CONT-BAG-2026-00918
    container_type VARCHAR(64) NOT NULL CHECK (container_type IN (
        'SEALED_CASH_BAG', 'CASH_BOX', 'VAULT_COMPARTMENT', 'ATM_CASSETTE',
        'TAMPER_EVIDENT_BAG', 'CIT_CONTAINER', 'TILL_DRAWER', 'SECURE_POUCH'
    )),
    current_location_id UUID NOT NULL REFERENCES cash_locations(id) ON DELETE CASCADE,
    barcode_identifier VARCHAR(128) UNIQUE NOT NULL,
    current_seal_number VARCHAR(64),
    seal_status VARCHAR(32) NOT NULL DEFAULT 'SEALED_INTACT' CHECK (seal_status IN ('SEALED_INTACT', 'UNSEALED', 'TAMPERED', 'REPLACED')),
    assigned_custodian VARCHAR(128),
    is_open BOOLEAN NOT NULL DEFAULT FALSE,
    last_inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. DENOMINATIONS & PHYSICAL CASH POSITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS currency_denominations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    denomination_value NUMERIC(18, 4) NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID UNIQUE NOT NULL REFERENCES cash_locations(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    opening_physical_cash NUMERIC(18, 4) NOT NULL DEFAULT 0,
    cash_inflows NUMERIC(18, 4) NOT NULL DEFAULT 0,
    cash_outflows NUMERIC(18, 4) NOT NULL DEFAULT 0,
    expected_physical_cash NUMERIC(18, 4) NOT NULL DEFAULT 0,
    actual_counted_cash NUMERIC(18, 4) NOT NULL DEFAULT 0,
    variance_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
    reserved_cash NUMERIC(18, 4) NOT NULL DEFAULT 0,
    available_physical_cash NUMERIC(18, 4) NOT NULL DEFAULT 0,
    target_safety_buffer NUMERIC(18, 4) NOT NULL DEFAULT 500000,
    liquidity_status VARCHAR(32) NOT NULL DEFAULT 'HEALTHY' CHECK (liquidity_status IN (
        'HEALTHY', 'WATCH', 'LOW', 'CRITICAL', 'RESTRICTED', 'EMERGENCY'
    )),
    last_counted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES cash_locations(id) ON DELETE CASCADE,
    count_type VARCHAR(64) NOT NULL CHECK (count_type IN (
        'OPENING_COUNT', 'CLOSING_COUNT', 'SPOT_COUNT', 'SURPRISE_COUNT',
        'HANDOVER_COUNT', 'VAULT_COUNT', 'TILL_COUNT', 'CIT_RECEIPT_COUNT',
        'CIT_DISPATCH_COUNT', 'AUDIT_COUNT', 'PERIOD_END_COUNT'
    )),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    expected_amount NUMERIC(18, 4) NOT NULL,
    counted_amount NUMERIC(18, 4) NOT NULL,
    variance_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
    denomination_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    counted_by VARCHAR(128) NOT NULL,
    verified_by VARCHAR(128),
    count_status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED' CHECK (count_status IN (
        'COUNT_REQUESTED', 'COUNT_IN_PROGRESS', 'COUNT_SUBMITTED', 'VERIFIED', 'RECONCILED', 'VARIANCE_INVESTIGATION'
    )),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. TILLS & VAULTS CONTROL
-- ============================================================================

CREATE TABLE IF NOT EXISTS tills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    till_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. TILL-ABJ-001
    location_id UUID NOT NULL REFERENCES cash_locations(id) ON DELETE CASCADE,
    assigned_operator VARCHAR(128) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
        'UNASSIGNED', 'ASSIGNED', 'OPEN', 'ACTIVE', 'SUSPENDED', 'HANDOVER_PENDING', 'CLOSED', 'RECONCILED'
    )),
    opening_balance NUMERIC(18, 4) NOT NULL DEFAULT 0,
    current_expected_balance NUMERIC(18, 4) NOT NULL DEFAULT 0,
    max_holding_limit NUMERIC(18, 4) NOT NULL DEFAULT 5000000,
    last_opened_at TIMESTAMPTZ,
    last_closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS till_handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    till_id UUID NOT NULL REFERENCES tills(id) ON DELETE CASCADE,
    outgoing_operator VARCHAR(128) NOT NULL,
    incoming_operator VARCHAR(128) NOT NULL,
    system_expected_amount NUMERIC(18, 4) NOT NULL,
    actual_counted_amount NUMERIC(18, 4) NOT NULL,
    variance_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
    handover_status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED' CHECK (handover_status IN ('INITIATED', 'COUNTED', 'VERIFIED', 'COMPLETED', 'DISPUTED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. VLT-HQ-LOS-01
    name VARCHAR(255) NOT NULL,
    location_id UUID NOT NULL REFERENCES cash_locations(id) ON DELETE CASCADE,
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    custodian_a VARCHAR(128) NOT NULL,
    custodian_b VARCHAR(128) NOT NULL,
    supervisor VARCHAR(128),
    dual_control_required BOOLEAN NOT NULL DEFAULT TRUE,
    max_vault_capacity NUMERIC(18, 4) NOT NULL DEFAULT 500000000,
    current_cash_holding NUMERIC(18, 4) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('LOCKED', 'OPEN', 'MAINTENANCE', 'EMERGENCY_LOCKDOWN')),
    last_opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vault_access_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    maker_custodian VARCHAR(128) NOT NULL,
    checker_custodian VARCHAR(128) NOT NULL,
    supervisor VARCHAR(128),
    access_reason VARCHAR(128) NOT NULL,
    device_fingerprint VARCHAR(128),
    authorized_amount NUMERIC(18, 4) DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'AUTHORIZED' CHECK (status IN ('REQUESTED', 'AUTHORIZED', 'REJECTED', 'CLOSED')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. CASH MOVEMENTS & CASH-IN-TRANSIT (CIT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. MOV-2026-0904-0012
    source_location_id UUID NOT NULL REFERENCES cash_locations(id),
    destination_location_id UUID NOT NULL REFERENCES cash_locations(id),
    movement_type VARCHAR(64) NOT NULL CHECK (movement_type IN (
        'VAULT_TO_TILL', 'TILL_TO_VAULT', 'VAULT_TO_BRANCH', 'BRANCH_TO_VAULT',
        'BRANCH_TO_BRANCH', 'AGENT_TO_BRANCH', 'BRANCH_TO_AGENT',
        'BRANCH_TO_BANK', 'BANK_TO_BRANCH', 'CIT_TO_BRANCH', 'BRANCH_TO_CIT'
    )),
    amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'REQUESTED', 'APPROVAL_REQUIRED', 'APPROVED', 'PREPARED',
        'DISPATCHED', 'IN_TRANSIT', 'RECEIVED', 'COUNTED', 'VERIFIED', 'RECONCILED', 'CLOSED',
        'CANCELLED', 'FAILED', 'LOST', 'DAMAGED', 'DISPUTED', 'EXCEPTION'
    )),
    initiated_by VARCHAR(128) NOT NULL,
    approved_by VARCHAR(128),
    received_by VARCHAR(128),
    gl_journal_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cit_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. CIT-SHP-2026-0044
    movement_id UUID NOT NULL REFERENCES cash_movements(id) ON DELETE CASCADE,
    cit_provider VARCHAR(128) NOT NULL, -- e.g. G4S Secure Solutions / Brinks West Africa
    vehicle_reg_number VARCHAR(64) NOT NULL,
    lead_courier_name VARCHAR(128) NOT NULL,
    seal_number VARCHAR(64) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    declared_amount NUMERIC(18, 4) NOT NULL,
    counted_received_amount NUMERIC(18, 4),
    variance_amount NUMERIC(18, 4) DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN (
        'REQUESTED', 'APPROVED', 'ASSIGNED', 'PREPARED', 'SEALED', 'PICKED_UP',
        'IN_TRANSIT', 'ARRIVED', 'RECEIVED', 'COUNTED', 'VERIFIED', 'RECONCILED',
        'DELAYED', 'TAMPERED', 'SHORT_DELIVERY', 'OVER_DELIVERY', 'ROUTE_DEVIATION', 'INCIDENT'
    )),
    pickup_at TIMESTAMPTZ,
    expected_arrival_at TIMESTAMPTZ NOT NULL,
    actual_arrival_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cit_custody_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES cit_shipments(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL CHECK (event_type IN (
        'PREPARED', 'SEALED', 'HANDED_TO_CIT', 'CIT_ACCEPTED', 'VEHICLE_DEPARTED',
        'IN_TRANSIT', 'ARRIVED', 'HANDOVER_STARTED', 'HANDOVER_COMPLETED', 'COUNTED', 'VERIFIED'
    )),
    actor VARCHAR(128) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    location_coordinates VARCHAR(64),
    evidence_hash VARCHAR(128) NOT NULL,
    previous_event_hash VARCHAR(128),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. CASH VARIANCES, ADJUSTMENTS & INCIDENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS cash_variances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variance_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. VAR-2026-00918
    location_id UUID NOT NULL REFERENCES cash_locations(id),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    expected_amount NUMERIC(18, 4) NOT NULL,
    actual_amount NUMERIC(18, 4) NOT NULL,
    variance_amount NUMERIC(18, 4) NOT NULL,
    variance_type VARCHAR(32) NOT NULL CHECK (variance_type IN (
        'NO_VARIANCE', 'SHORTAGE', 'OVERAGE', 'DENOMINATION_MISMATCH', 'UNIDENTIFIED_CASH'
    )),
    severity VARCHAR(16) NOT NULL DEFAULT 'LOW' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(32) NOT NULL DEFAULT 'VARIANCE_DETECTED' CHECK (status IN (
        'VARIANCE_DETECTED', 'INVESTIGATION_REQUIRED', 'REVIEW', 'APPROVED_ADJUSTMENT', 'RESOLVED'
    )),
    investigated_by VARCHAR(128),
    gl_suspense_journal_id UUID,
    root_cause_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. INC-CASH-2026-0012
    incident_type VARCHAR(64) NOT NULL CHECK (incident_type IN (
        'SEAL_MISMATCH', 'SHORT_DELIVERY', 'OVER_DELIVERY', 'ROUTE_DEVIATION',
        'UNAUTHORIZED_VAULT_ACCESS', 'TAMPER_DETECTED', 'COUNTERFEIT_NOTE', 'THEFT_SUSPICION'
    )),
    severity VARCHAR(16) NOT NULL DEFAULT 'HIGH' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    location_id UUID REFERENCES cash_locations(id),
    shipment_id UUID REFERENCES cit_shipments(id),
    disputed_amount NUMERIC(18, 4) DEFAULT 0,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'TRIAGED', 'INVESTIGATING', 'ACTION_REQUIRED', 'RESOLVED', 'CLOSED')),
    reported_by VARCHAR(128) NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. HIGH-PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cash_locations_type_country ON cash_locations(location_type, country);
CREATE INDEX IF NOT EXISTS idx_cash_positions_location ON cash_positions(location_id, liquidity_status);
CREATE INDEX IF NOT EXISTS idx_cash_counts_location ON cash_counts(location_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_movements_status ON cash_movements(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cit_shipments_status ON cit_shipments(status, expected_arrival_at);
CREATE INDEX IF NOT EXISTS idx_cash_variances_status_severity ON cash_variances(status, severity);
CREATE INDEX IF NOT EXISTS idx_cash_incidents_status ON cash_incidents(status, severity);
