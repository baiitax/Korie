-- ==============================================================================
-- KORIEPAY: AGGREGATOR PORTAL — LIVE DATABASE WIRING
-- Migration: 20260907000034_aggregator_portal_live.sql
-- ==============================================================================
-- Real, org-based aggregator model. An "aggregator" is simply a
-- public.organizations row with business_type = 'AGGREGATOR'; the agents and
-- merchants it supervises are ordinary public.agents / public.merchant_profiles
-- rows whose org_id points at that aggregator's own tenant org. This lets the
-- aggregator portal reuse every existing agency-banking/merchant table, RPC,
-- and ledger primitive (agents, agency_transactions, agent_commissions,
-- agent_commission_rates, agent_tier_limit_policies, settlement_batches,
-- settlement_batch_lines, ledger_accounts/entries/transactions,
-- run_daily_settlement, transfer_agent_float) exactly as agency-ops already
-- does for a FINTECH org — no parallel schema.
--
-- New tables added here are the pieces with no existing analogue at all:
--   1. public.aggregators              — 1:1 profile row per AGGREGATOR org
--      (this is also what src/app/admin/aggregators/page.tsx +
--      resourceRegistry.ts's "aggregators" resource already expect to read).
--   2. public.aggregator_staff_users   — real auth-backed staff/login table
--      (mirrors merchant_staff_users).
--   3. public.aggregator_territories   — geographic supervision units.
--   4. public.aggregator_targets       — quarterly/monthly KPI targets set by
--      aggregator management (no existing analogue).
--   5. public.aggregator_notifications — mirrors agent_notifications.
--   6. public.aggregator_api_keys      — mirrors merchant_api_keys exactly
--      (developers page).
--   7. public.aggregator_devices       — real device/session registry for the
--      security/devices pages (no existing generic infra for this).
--   8. public.aggregator_risk_alerts, public.aggregator_reconciliations,
--      public.aggregator_exceptions — dedicated aggregator-level oversight
--      records (distinct from an individual agent's own reconciliation).
--
-- Reused as-is (no schema change): organizations, agents, merchant_profiles,
-- agency_transactions, agent_commissions, agent_commission_rates,
-- agent_tier_limit_policies, agent_kyc_documents, merchant_kyb_documents,
-- settlement_batches, settlement_batch_lines, ledger_accounts/entries/
-- transactions, support_tickets (customer_type='AGGREGATOR'),
-- agent_onboarding_applications, run_daily_settlement(), transfer_agent_float().
-- ==============================================================================

-- ----------------------------------------------------------------------------
-- 1. AGGREGATORS — one profile row per AGGREGATOR-type organization.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.aggregators (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  aggregator_code          VARCHAR(32) NOT NULL UNIQUE,
  business_name            VARCHAR(255) NOT NULL,
  legal_entity             VARCHAR(255),
  rc_number                VARCHAR(64),
  country                  VARCHAR(16) NOT NULL CHECK (country IN ('NG', 'NE')),
  currency                 VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
  tier                     VARCHAR(32) NOT NULL DEFAULT 'TIER_1_SUPER_AGGREGATOR'
                             CHECK (tier IN ('TIER_1_SUPER_AGGREGATOR', 'TIER_2_REGIONAL_AGGREGATOR')),
  status                   VARCHAR(16) NOT NULL DEFAULT 'PENDING'
                             CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVIEW')),
  kyb_status               VARCHAR(16) NOT NULL DEFAULT 'PENDING'
                             CHECK (kyb_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  headquarters             VARCHAR(255),
  contact_email            VARCHAR(255) NOT NULL,
  contact_phone            VARCHAR(32) NOT NULL,
  settlement_bank          VARCHAR(128),
  settlement_account_number VARCHAR(32),
  float_account_id         UUID REFERENCES public.ledger_accounts(id) ON DELETE SET NULL,
  reserve_account_id       UUID REFERENCES public.ledger_accounts(id) ON DELETE SET NULL,
  escrow_account_id        UUID REFERENCES public.ledger_accounts(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aggregators_org ON public.aggregators(org_id);
CREATE INDEX IF NOT EXISTS idx_aggregators_status ON public.aggregators(status);

ALTER TABLE public.aggregators ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. AGGREGATOR STAFF USERS — real Supabase-Auth-backed login/staff table.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.aggregator_staff_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id UUID NOT NULL REFERENCES public.aggregators(id) ON DELETE CASCADE,
  auth_user_id  UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  phone         VARCHAR(32),
  role          VARCHAR(24) NOT NULL DEFAULT 'AGGREGATOR_OWNER'
                  CHECK (role IN ('AGGREGATOR_OWNER', 'AGGREGATOR_ADMIN', 'OPERATIONS_MANAGER',
                                  'FINANCE_MANAGER', 'COMPLIANCE_OFFICER', 'RISK_OFFICER',
                                  'FIELD_OFFICER', 'AUDITOR', 'ANALYST')),
  territory_scope TEXT[] NOT NULL DEFAULT '{}',
  status        VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED')),
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aggregator_id, email)
);

CREATE INDEX IF NOT EXISTS idx_aggregator_staff_aggregator ON public.aggregator_staff_users(aggregator_id);
CREATE INDEX IF NOT EXISTS idx_aggregator_staff_auth ON public.aggregator_staff_users(auth_user_id);

ALTER TABLE public.aggregator_staff_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aggregator_staff_self_select ON public.aggregator_staff_users;
CREATE POLICY aggregator_staff_self_select ON public.aggregator_staff_users
  FOR SELECT USING (
    aggregator_id IN (SELECT aggregator_id FROM public.aggregator_staff_users WHERE auth_user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 3. AGGREGATOR TERRITORIES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.aggregator_territories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id     UUID NOT NULL REFERENCES public.aggregators(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  code              VARCHAR(32) NOT NULL,
  country           VARCHAR(16) NOT NULL CHECK (country IN ('NG', 'NE')),
  state_or_region   VARCHAR(128),
  lga_or_commune    VARCHAR(128),
  supervisor_staff_id UUID REFERENCES public.aggregator_staff_users(id) ON DELETE SET NULL,
  supervisor_name   VARCHAR(255),
  hub_address       VARCHAR(500),
  hub_phone         VARCHAR(32),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aggregator_id, code)
);

CREATE INDEX IF NOT EXISTS idx_aggregator_territories_agg ON public.aggregator_territories(aggregator_id);

ALTER TABLE public.aggregator_territories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aggregator_territories_staff_select ON public.aggregator_territories;
CREATE POLICY aggregator_territories_staff_select ON public.aggregator_territories
  FOR SELECT USING (
    aggregator_id IN (SELECT aggregator_id FROM public.aggregator_staff_users WHERE auth_user_id = auth.uid())
  );

-- Agents/merchants can optionally be tagged to a territory. Nullable FKs on
-- the existing tables, added additively (no data loss, no behavior change
-- for existing non-aggregator agents/merchants).
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS aggregator_territory_id UUID REFERENCES public.aggregator_territories(id) ON DELETE SET NULL;
ALTER TABLE public.merchant_profiles
  ADD COLUMN IF NOT EXISTS aggregator_territory_id UUID REFERENCES public.aggregator_territories(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 4. AGGREGATOR TARGETS — management-set KPI milestones (no existing analogue).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.aggregator_targets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id  UUID NOT NULL REFERENCES public.aggregators(id) ON DELETE CASCADE,
  title          VARCHAR(255) NOT NULL,
  metric_type    VARCHAR(24) NOT NULL CHECK (metric_type IN ('TPV', 'TRANSACTION_COUNT', 'ACTIVE_AGENTS', 'NEW_MERCHANTS', 'REVENUE')),
  target_value   NUMERIC(24,2) NOT NULL,
  unit           VARCHAR(16) NOT NULL DEFAULT 'NGN',
  period_label   VARCHAR(32) NOT NULL,
  deadline       DATE NOT NULL,
  created_by     UUID REFERENCES public.aggregator_staff_users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aggregator_targets_agg ON public.aggregator_targets(aggregator_id);

ALTER TABLE public.aggregator_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aggregator_targets_staff_select ON public.aggregator_targets;
CREATE POLICY aggregator_targets_staff_select ON public.aggregator_targets
  FOR SELECT USING (
    aggregator_id IN (SELECT aggregator_id FROM public.aggregator_staff_users WHERE auth_user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 5. AGGREGATOR NOTIFICATIONS — mirrors agent_notifications exactly.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.aggregator_notifications (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id          UUID NOT NULL REFERENCES public.aggregators(id) ON DELETE CASCADE,
  category               VARCHAR(32) NOT NULL CHECK (category IN ('TRANSACTION', 'LIQUIDITY', 'KYC', 'SETTLEMENT', 'COMPLIANCE', 'RISK', 'SYSTEM', 'SUPPORT')),
  severity               VARCHAR(16) NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  title                  VARCHAR(255) NOT NULL,
  body                   TEXT NOT NULL,
  related_transaction_id UUID REFERENCES public.agency_transactions(id) ON DELETE SET NULL,
  is_read                BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at                TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_aggregator_notif_agg ON public.aggregator_notifications(aggregator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aggregator_notif_unread ON public.aggregator_notifications(aggregator_id) WHERE is_read = FALSE;

ALTER TABLE public.aggregator_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aggregator_notif_staff_select ON public.aggregator_notifications;
CREATE POLICY aggregator_notif_staff_select ON public.aggregator_notifications
  FOR SELECT USING (
    aggregator_id IN (SELECT aggregator_id FROM public.aggregator_staff_users WHERE auth_user_id = auth.uid())
  );
DROP POLICY IF EXISTS aggregator_notif_staff_update ON public.aggregator_notifications;
CREATE POLICY aggregator_notif_staff_update ON public.aggregator_notifications
  FOR UPDATE USING (
    aggregator_id IN (SELECT aggregator_id FROM public.aggregator_staff_users WHERE auth_user_id = auth.uid())
  ) WITH CHECK (
    aggregator_id IN (SELECT aggregator_id FROM public.aggregator_staff_users WHERE auth_user_id = auth.uid())
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.aggregator_notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 6. AGGREGATOR API KEYS — mirrors merchant_api_keys exactly (developers page).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.aggregator_api_keys (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id     UUID NOT NULL REFERENCES public.aggregators(id) ON DELETE CASCADE,
  key_name          VARCHAR(128) NOT NULL,
  public_key        VARCHAR(128) NOT NULL UNIQUE,
  secret_key_hash   TEXT NOT NULL,
  secret_key_last4  VARCHAR(8) NOT NULL,
  environment       VARCHAR(16) NOT NULL DEFAULT 'SANDBOX' CHECK (environment IN ('PRODUCTION', 'SANDBOX')),
  status            VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  last_used_at      TIMESTAMPTZ,
  created_by        UUID REFERENCES public.aggregator_staff_users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aggregator_keys_agg ON public.aggregator_api_keys(aggregator_id);

ALTER TABLE public.aggregator_api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aggregator_keys_staff_select ON public.aggregator_api_keys;
CREATE POLICY aggregator_keys_staff_select ON public.aggregator_api_keys
  FOR SELECT USING (
    aggregator_id IN (SELECT aggregator_id FROM public.aggregator_staff_users WHERE auth_user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 7. AGGREGATOR DEVICES — real device/session registry (security/devices pages).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.aggregator_devices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id         UUID NOT NULL REFERENCES public.aggregator_staff_users(id) ON DELETE CASCADE,
  device_label     VARCHAR(255) NOT NULL,
  user_agent       TEXT,
  ip_address       VARCHAR(64),
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_current       BOOLEAN NOT NULL DEFAULT FALSE,
  status           VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aggregator_devices_staff ON public.aggregator_devices(staff_id, last_active_at DESC);

ALTER TABLE public.aggregator_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aggregator_devices_self_select ON public.aggregator_devices;
CREATE POLICY aggregator_devices_self_select ON public.aggregator_devices
  FOR SELECT USING (
    staff_id IN (SELECT id FROM public.aggregator_staff_users WHERE auth_user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 8. AGGREGATOR RISK ALERTS, RECONCILIATIONS, EXCEPTIONS
--    (network-level oversight records — distinct from an individual agent's
--    own agent_cash_reconciliations row).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.aggregator_risk_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id     UUID NOT NULL REFERENCES public.aggregators(id) ON DELETE CASCADE,
  alert_type        VARCHAR(32) NOT NULL CHECK (alert_type IN ('VELOCITY_ANOMALY', 'REPEATED_FAILURES', 'UNUSUAL_CASHOUT', 'LOCATION_JUMP', 'SETTLEMENT_SPIKE')),
  severity          VARCHAR(16) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  entity_type       VARCHAR(16) NOT NULL CHECK (entity_type IN ('AGENT', 'MERCHANT')),
  agent_id          UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  merchant_id       UUID REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  details           TEXT NOT NULL,
  recommended_action TEXT,
  status            VARCHAR(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED')),
  acknowledged_by   UUID REFERENCES public.aggregator_staff_users(id) ON DELETE SET NULL,
  acknowledged_at   TIMESTAMPTZ,
  detected_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT aggregator_risk_alert_entity_ref CHECK (
    (entity_type = 'AGENT' AND agent_id IS NOT NULL) OR (entity_type = 'MERCHANT' AND merchant_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_aggregator_risk_agg ON public.aggregator_risk_alerts(aggregator_id, detected_at DESC);

ALTER TABLE public.aggregator_risk_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aggregator_risk_staff_select ON public.aggregator_risk_alerts;
CREATE POLICY aggregator_risk_staff_select ON public.aggregator_risk_alerts
  FOR SELECT USING (
    aggregator_id IN (SELECT aggregator_id FROM public.aggregator_staff_users WHERE auth_user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.aggregator_reconciliations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id            UUID NOT NULL REFERENCES public.aggregators(id) ON DELETE CASCADE,
  reconciliation_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  channel_or_entity        VARCHAR(255) NOT NULL,
  provider_node            VARCHAR(128),
  internal_ledger_total    NUMERIC(24,2) NOT NULL DEFAULT 0,
  provider_gateway_total   NUMERIC(24,2) NOT NULL DEFAULT 0,
  bank_settled_total       NUMERIC(24,2) NOT NULL DEFAULT 0,
  variance_amount          NUMERIC(24,2) NOT NULL DEFAULT 0,
  status                   VARCHAR(24) NOT NULL DEFAULT 'PENDING_REVIEW'
                             CHECK (status IN ('MATCHED', 'PARTIALLY_MATCHED', 'MISMATCH', 'MISSING', 'PENDING_REVIEW', 'RESOLVED')),
  discrepancy_count        INTEGER NOT NULL DEFAULT 0,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_aggregator_recon_agg ON public.aggregator_reconciliations(aggregator_id, reconciliation_date DESC);

ALTER TABLE public.aggregator_reconciliations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aggregator_recon_staff_select ON public.aggregator_reconciliations;
CREATE POLICY aggregator_recon_staff_select ON public.aggregator_reconciliations
  FOR SELECT USING (
    aggregator_id IN (SELECT aggregator_id FROM public.aggregator_staff_users WHERE auth_user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.aggregator_exceptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id     UUID NOT NULL REFERENCES public.aggregators(id) ON DELETE CASCADE,
  reference         VARCHAR(64) NOT NULL UNIQUE,
  category          VARCHAR(24) NOT NULL CHECK (category IN ('PAYMENT', 'WALLET', 'SETTLEMENT', 'AGENT', 'MERCHANT', 'PROVIDER', 'COMPLIANCE', 'RECONCILIATION')),
  severity          VARCHAR(16) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  affected_entity   VARCHAR(255) NOT NULL,
  current_state     VARCHAR(24) NOT NULL DEFAULT 'OPEN' CHECK (current_state IN ('OPEN', 'INVESTIGATING', 'ACTION_REQUIRED', 'RESOLVED')),
  owner_staff_id    UUID REFERENCES public.aggregator_staff_users(id) ON DELETE SET NULL,
  description       TEXT NOT NULL,
  recommended_action TEXT,
  resolution_notes  TEXT,
  detected_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_aggregator_exceptions_agg ON public.aggregator_exceptions(aggregator_id, detected_at DESC);

ALTER TABLE public.aggregator_exceptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aggregator_exceptions_staff_select ON public.aggregator_exceptions;
CREATE POLICY aggregator_exceptions_staff_select ON public.aggregator_exceptions
  FOR SELECT USING (
    aggregator_id IN (SELECT aggregator_id FROM public.aggregator_staff_users WHERE auth_user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 9. AGGREGATOR AUDIT LOG — mirrors agent_audit_logs/merchant_audit_logs.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.aggregator_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id   UUID REFERENCES public.aggregators(id) ON DELETE SET NULL,
  actor_staff_id  UUID REFERENCES public.aggregator_staff_users(id) ON DELETE SET NULL,
  action          VARCHAR(64) NOT NULL,
  target_type     VARCHAR(64),
  target_id       VARCHAR(128),
  result          VARCHAR(16) NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE')),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aggregator_audit_agg ON public.aggregator_audit_logs(aggregator_id, created_at DESC);

ALTER TABLE public.aggregator_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aggregator_audit_staff_select ON public.aggregator_audit_logs;
CREATE POLICY aggregator_audit_staff_select ON public.aggregator_audit_logs
  FOR SELECT USING (
    aggregator_id IN (SELECT aggregator_id FROM public.aggregator_staff_users WHERE auth_user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 10. RBAC — register aggregator staff roles in the shared roles table.
-- ----------------------------------------------------------------------------

INSERT INTO public.roles (name, description, is_system_role)
VALUES
  ('AGGREGATOR_OWNER', 'Full aggregator network management: float, agents, merchants, team, settings.', TRUE),
  ('AGGREGATOR_OPS', 'Aggregator operations: float rebalancing, exception resolution, agent onboarding.', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 11. RPC — provision an aggregator's liquidity/reserve/escrow ledger
--     accounts (mirrors provision_merchant_settlement_account exactly).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.provision_aggregator_accounts(
  p_aggregator_id UUID,
  p_org_id UUID,
  p_currency VARCHAR,
  p_country VARCHAR
) RETURNS public.aggregators
LANGUAGE plpgsql
AS $$
DECLARE
  v_agg public.aggregators;
  v_float_id UUID;
  v_reserve_id UUID;
  v_escrow_id UUID;
BEGIN
  SELECT * INTO v_agg FROM public.aggregators WHERE id = p_aggregator_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'AGGREGATOR_NOT_FOUND';
  END IF;

  IF v_agg.float_account_id IS NOT NULL THEN
    RETURN v_agg; -- already provisioned
  END IF;

  INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
  VALUES (p_org_id, 'AGG-FLOAT-' || p_currency || '-' || substr(replace(p_aggregator_id::text, '-', ''), 1, 10),
          'Aggregator Main Float', 'ASSET', p_currency, p_country, 0.00)
  RETURNING id INTO v_float_id;

  INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
  VALUES (p_org_id, 'AGG-RESERVE-' || p_currency || '-' || substr(replace(p_aggregator_id::text, '-', ''), 1, 10),
          'Aggregator Reserve Wallet', 'ASSET', p_currency, p_country, 0.00)
  RETURNING id INTO v_reserve_id;

  INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
  VALUES (p_org_id, 'AGG-ESCROW-' || p_currency || '-' || substr(replace(p_aggregator_id::text, '-', ''), 1, 10),
          'Aggregator Escrow Balance', 'LIABILITY', p_currency, p_country, 0.00)
  RETURNING id INTO v_escrow_id;

  UPDATE public.aggregators
  SET float_account_id = v_float_id, reserve_account_id = v_reserve_id, escrow_account_id = v_escrow_id, updated_at = NOW()
  WHERE id = p_aggregator_id
  RETURNING * INTO v_agg;

  RETURN v_agg;
END;
$$;

-- ----------------------------------------------------------------------------
-- 12. RPC — aggregator float dispatch to a supervised agent. Distinct from
--     transfer_agent_float (which moves float between a SUPER_AGENT and its
--     own sub-agents); this moves float from the aggregator's own main float
--     ledger account to any agent whose org_id belongs to that aggregator.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.aggregator_dispatch_float(
  p_aggregator_id UUID,
  p_agent_id UUID,
  p_amount NUMERIC,
  p_note TEXT DEFAULT NULL
) RETURNS public.ledger_transactions
LANGUAGE plpgsql
AS $$
DECLARE
  v_agg public.aggregators;
  v_agent_org UUID;
  v_currency VARCHAR(3);
  v_agent_wallet_id UUID;
  v_float_balance NUMERIC(24,2);
  v_ledger_tx public.ledger_transactions;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  SELECT * INTO v_agg FROM public.aggregators WHERE id = p_aggregator_id;
  IF NOT FOUND OR v_agg.float_account_id IS NULL THEN
    RAISE EXCEPTION 'AGGREGATOR_FLOAT_NOT_PROVISIONED';
  END IF;

  SELECT org_id INTO v_agent_org FROM public.agents WHERE id = p_agent_id;
  IF v_agent_org IS NULL OR v_agent_org <> v_agg.org_id THEN
    RAISE EXCEPTION 'AGENT_NOT_IN_AGGREGATOR_NETWORK';
  END IF;

  v_currency := v_agg.currency;

  SELECT la.id INTO v_agent_wallet_id
  FROM public.agent_float_accounts afa JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
  WHERE afa.agent_id = p_agent_id AND afa.account_kind = 'WALLET_FLOAT' AND afa.currency = v_currency;

  IF v_agent_wallet_id IS NULL THEN
    RAISE EXCEPTION 'AGENT_FLOAT_NOT_PROVISIONED';
  END IF;

  SELECT balance INTO v_float_balance FROM public.ledger_accounts WHERE id = v_agg.float_account_id FOR UPDATE;
  IF v_float_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_AGGREGATOR_FLOAT';
  END IF;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (
    v_agg.org_id,
    'AGG-FLOAT-' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6)),
    'Aggregator float dispatch to agent', p_amount, v_currency, 'COMMITTED'
  )
  RETURNING * INTO v_ledger_tx;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx.id, v_agg.float_account_id, 'DEBIT', p_amount, v_currency, 'Aggregator main float debited: dispatch to agent'),
    (v_ledger_tx.id, v_agent_wallet_id, 'CREDIT', p_amount, v_currency, COALESCE(p_note, 'Aggregator float dispatch credited to agent wallet'));

  UPDATE public.ledger_accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_agg.float_account_id;
  UPDATE public.ledger_accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = v_agent_wallet_id;

  RETURN v_ledger_tx;
END;
$$;

-- ----------------------------------------------------------------------------
-- 13. Realtime for aggregator-facing tables.
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.aggregator_risk_alerts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.aggregator_exceptions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
