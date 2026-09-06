-- ==============================================================================
-- KORIEPAY SUPPORT PORTAL — LIVE PRODUCTION SCHEMA
-- Migration: 20260906000031_support_portal_live.sql
--
-- CONTEXT: the Support Operating System (/support/*, /api/support/*) has run
-- entirely on an in-process singleton (SupportOpsStore, seeded from
-- supportSeed.ts) with a client-asserted x-kp-support-officer header standing
-- in for authentication. This migration gives it the same real backend the
-- Customer Portal and Agency Banking already have:
--   - real Supabase Auth accounts for support officers (support_officers,
--     auth_user_id-linked, same shape as agents/customers);
--   - persistent tables for every support-domain entity (tickets, messages,
--     events, disputes, escalations, tasks, knowledge, macros, CSAT,
--     notifications, audit, playbooks, incidents, automation, QA, training);
--   - Customer 360 / transaction investigation continue to be RESOLVED
--     against the real customers/wallets/customer_transactions and
--     agents/agency_transactions tables (no fork of that data — support
--     reads the same rows the customer/agency portals write).
--
-- Design principles (same as Agency Banking / Customer Portal):
--   - No parallel ledger. Support never writes to wallets/ledger_accounts.
--     A financial decision on a dispute creates a row in
--     support_dispute_recovery_cases with financial_action = 'REQUESTED' —
--     it is a REQUEST for a real ops/finance actor to execute, not an
--     automatic balance mutation.
--   - RLS scopes officer-owned reads to auth_user_id = auth.uid() via
--     support_officers; general support tables (tickets, disputes, etc.) are
--     service-role-only (officers reach them exclusively through
--     authenticated /api/support/* routes, exactly like the agency/compliance
--     back-office tables already in this schema).
--   - SLA is NEVER stored as a static status — it stays computed at read time
--     from created_at/priority/resolved_at, exactly as SupportOpsEngine does
--     today. Only the raw timestamps are persisted.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SUPPORT_OFFICERS — real Supabase Auth-linked officer roster.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  officer_code VARCHAR(32) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(32) NOT NULL CHECK (role IN (
    'TIER_1_JUNIOR', 'TIER_2_SENIOR', 'TIER_3_FINANCE', 'TIER_3_FRAUD',
    'TIER_3_COMPLIANCE', 'TIER_3_TECH_OPS', 'SUPPORT_SUPERVISOR',
    'SUPPORT_MANAGER', 'SUPPORT_READ_ONLY', 'SUPER_ADMIN'
  )),
  tier VARCHAR(32) NOT NULL DEFAULT 'TIER_1_JUNIOR' CHECK (tier IN (
    'TIER_0_AUTOMATION', 'TIER_1_JUNIOR', 'TIER_2_SENIOR', 'TIER_3_SPECIALIST', 'MANAGEMENT'
  )),
  jurisdiction VARCHAR(16) NOT NULL DEFAULT 'NG' CHECK (jurisdiction IN ('NG', 'NE', 'CROSS_BORDER')),
  languages VARCHAR(8)[] NOT NULL DEFAULT ARRAY['en']::VARCHAR(8)[],
  max_capacity INT NOT NULL DEFAULT 20,
  status VARCHAR(16) NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE', 'BUSY', 'ON_BREAK', 'OFFLINE')),
  qa_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_officers_org ON public.support_officers(org_id);
CREATE INDEX IF NOT EXISTS idx_support_officers_auth_user ON public.support_officers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_support_officers_role ON public.support_officers(role);
CREATE INDEX IF NOT EXISTS idx_support_officers_status ON public.support_officers(status) WHERE status = 'ONLINE';

ALTER TABLE public.support_officers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_officers_self_select ON public.support_officers;
CREATE POLICY support_officers_self_select ON public.support_officers
  FOR SELECT USING (auth_user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 2. SUPPORT_TICKETS + SUPPORT_TICKET_MESSAGES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(32) NOT NULL UNIQUE,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(32) NOT NULL,
  priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL')),
  status VARCHAR(32) NOT NULL DEFAULT 'NEW' CHECK (status IN (
    'NEW', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER',
    'WAITING_FOR_INTERNAL_TEAM', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED'
  )),
  customer_type VARCHAR(16) NOT NULL DEFAULT 'CUSTOMER' CHECK (customer_type IN ('CUSTOMER', 'AGENT', 'MERCHANT', 'AGGREGATOR', 'PARTNER')),
  -- Free-text customer id/name: tickets may reference a real customers.id or
  -- agents.id (validated server-side when resolvable) OR a counterparty that
  -- has no portal account yet (e.g. a walk-in complaint) — never a foreign
  -- key, to avoid rejecting legitimate tickets about entities outside these
  -- two tables.
  customer_id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(32),
  jurisdiction VARCHAR(16) NOT NULL DEFAULT 'NG' CHECK (jurisdiction IN ('NG', 'NE', 'CROSS_BORDER')),
  channel VARCHAR(32) NOT NULL DEFAULT 'IN_APP',
  language VARCHAR(8) NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ha', 'fr')),
  assigned_officer_id UUID REFERENCES public.support_officers(id) ON DELETE SET NULL,
  tier_assigned VARCHAR(32) NOT NULL DEFAULT 'TIER_0_AUTOMATION',
  related_transaction_reference VARCHAR(64),
  incident_id UUID,
  first_response_due_at TIMESTAMPTZ NOT NULL,
  resolution_due_at TIMESTAMPTZ NOT NULL,
  first_responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sentiment VARCHAR(16) NOT NULL DEFAULT 'NEUTRAL' CHECK (sentiment IN ('POSITIVE', 'NEUTRAL', 'FRUSTRATED', 'CRITICAL_ANGRY')),
  satisfaction_rating SMALLINT CHECK (satisfaction_rating BETWEEN 1 AND 5),
  satisfaction_comment TEXT,
  root_cause_category VARCHAR(64),
  is_duplicate_of UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  resolution_paused_ms BIGINT NOT NULL DEFAULT 0,
  resolution_paused_since TIMESTAMPTZ,
  idempotency_key VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON public.support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated ON public.support_tickets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_open ON public.support_tickets(status, updated_at DESC)
  WHERE status NOT IN ('RESOLVED', 'CLOSED');
CREATE INDEX IF NOT EXISTS idx_support_tickets_unassigned ON public.support_tickets(created_at)
  WHERE assigned_officer_id IS NULL AND status NOT IN ('RESOLVED', 'CLOSED');
CREATE INDEX IF NOT EXISTS idx_support_tickets_related_tx ON public.support_tickets(related_transaction_reference)
  WHERE related_transaction_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_idempotency ON public.support_tickets(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
-- Full-text search across the fields the queue searches by (subject, ticket
-- number, customer name/id) — avoids a sequential ILIKE scan on every
-- keystroke of the queue search box.
CREATE INDEX IF NOT EXISTS idx_support_tickets_search ON public.support_tickets
  USING GIN (to_tsvector('simple', ticket_number || ' ' || subject || ' ' || customer_name || ' ' || customer_id));

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
-- Service-role only: officers reach this exclusively through authenticated
-- /api/support/* routes (same pattern as agent_commissions, settlement_batches).

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type VARCHAR(16) NOT NULL CHECK (sender_type IN ('CUSTOMER', 'AGENT', 'SYSTEM', 'AUTOMATION')),
  sender_id VARCHAR(64) NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
  macro_used VARCHAR(64),
  attachments JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages REPLICA IDENTITY FULL;

-- ------------------------------------------------------------------------------
-- 3. SUPPORT_EVENTS — immutable per-ticket activity log (spec §51).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  event_type VARCHAR(48) NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  actor_role VARCHAR(32) NOT NULL,
  from_status VARCHAR(32),
  to_status VARCHAR(32),
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  request_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_events_ticket ON public.support_events(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_events_recent ON public.support_events(created_at DESC);
ALTER TABLE public.support_events ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. SUPPORT_DISPUTES — support-initiated dispute cases. A financial decision
--    NEVER touches wallets/ledger here; it creates a recovery-case REQUEST
--    row for an authoritative ops/finance process to execute (spec §31).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_number VARCHAR(32) NOT NULL UNIQUE,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  category VARCHAR(32) NOT NULL CHECK (category IN (
    'UNAUTHORIZED', 'DUPLICATE', 'INCORRECT_AMOUNT', 'FAILED_TRANSACTION',
    'CHARGED_NOT_RECEIVED', 'REFUND', 'REVERSAL', 'OTHER'
  )),
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN (
    'OPEN', 'UNDER_REVIEW', 'REQUESTED_INFORMATION', 'ESCALATED', 'DECISION', 'RESOLVED', 'CLOSED'
  )),
  priority VARCHAR(16) NOT NULL DEFAULT 'HIGH' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL')),
  transaction_reference VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  jurisdiction VARCHAR(16) NOT NULL DEFAULT 'NG' CHECK (jurisdiction IN ('NG', 'NE', 'CROSS_BORDER')),
  claim TEXT NOT NULL,
  claim_amount NUMERIC(24,2) NOT NULL CHECK (claim_amount > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
  evidence JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_by_officer_id UUID NOT NULL REFERENCES public.support_officers(id),
  assigned_officer_id UUID REFERENCES public.support_officers(id) ON DELETE SET NULL,
  decision_owner VARCHAR(32) NOT NULL CHECK (decision_owner IN ('TIER_3_FRAUD', 'TIER_3_COMPLIANCE', 'TIER_3_FINANCE', 'SUPPORT_MANAGER')),
  decision_type VARCHAR(32) CHECK (decision_type IN ('REFUND_APPROVED', 'REVERSAL_APPROVED', 'REJECTED', 'PARTIAL_REFUND', 'UNDER_INVESTIGATION')),
  decided_by_officer_id UUID REFERENCES public.support_officers(id),
  decision_reason TEXT,
  decided_at TIMESTAMPTZ,
  recovery_case_reference VARCHAR(64),
  timeline JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_disputes_status ON public.support_disputes(status);
CREATE INDEX IF NOT EXISTS idx_support_disputes_customer ON public.support_disputes(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_disputes_tx ON public.support_disputes(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_support_disputes_ticket ON public.support_disputes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_disputes_open ON public.support_disputes(created_at DESC)
  WHERE status NOT IN ('RESOLVED', 'CLOSED');
ALTER TABLE public.support_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_disputes REPLICA IDENTITY FULL;

-- The authoritative recovery-case REQUEST created by an approved financial
-- decision. This table is intentionally NOT a balance mutation — status
-- starts at REQUESTED and only a real finance/ops actor (outside Support)
-- moves it to EXECUTED once the ledger has actually been posted.
CREATE TABLE IF NOT EXISTS public.support_dispute_recovery_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(32) NOT NULL UNIQUE,
  dispute_id UUID NOT NULL REFERENCES public.support_disputes(id) ON DELETE CASCADE,
  transaction_reference VARCHAR(64) NOT NULL,
  claimant_id VARCHAR(64) NOT NULL,
  claimant_name VARCHAR(255) NOT NULL,
  category VARCHAR(32) NOT NULL,
  amount NUMERIC(24,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
  priority VARCHAR(8) NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0', 'P1', 'P2')),
  financial_action VARCHAR(16) NOT NULL DEFAULT 'REQUESTED' CHECK (financial_action IN ('REQUESTED', 'EXECUTED', 'REJECTED')),
  requested_by_officer_id UUID NOT NULL REFERENCES public.support_officers(id),
  executed_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMPTZ,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_recovery_cases_dispute ON public.support_dispute_recovery_cases(dispute_id);
CREATE INDEX IF NOT EXISTS idx_support_recovery_cases_pending ON public.support_dispute_recovery_cases(created_at DESC)
  WHERE financial_action = 'REQUESTED';
ALTER TABLE public.support_dispute_recovery_cases ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5. SUPPORT_ESCALATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_number VARCHAR(32) NOT NULL UNIQUE,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  priority VARCHAR(16) NOT NULL DEFAULT 'HIGH' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL')),
  destination VARCHAR(32) NOT NULL CHECK (destination IN (
    'COMPLIANCE', 'FRAUD_RISK', 'ENGINEERING', 'BANKING_OPS', 'FINANCE', 'SETTLEMENT', 'MANAGEMENT'
  )),
  assigned_to_officer_id UUID REFERENCES public.support_officers(id) ON DELETE SET NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_REVIEW', 'ACTIONED', 'RESOLVED')),
  sla_due_at TIMESTAMPTZ NOT NULL,
  resolution_note TEXT,
  created_by_officer_id UUID NOT NULL REFERENCES public.support_officers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_escalations_ticket ON public.support_escalations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_escalations_status ON public.support_escalations(status);
CREATE INDEX IF NOT EXISTS idx_support_escalations_destination ON public.support_escalations(destination);
ALTER TABLE public.support_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_escalations REPLICA IDENTITY FULL;

-- ------------------------------------------------------------------------------
-- 6. SUPPORT_TASKS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL')),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  customer_id VARCHAR(64),
  assigned_to_officer_id UUID REFERENCES public.support_officers(id) ON DELETE SET NULL,
  created_by_officer_id UUID NOT NULL REFERENCES public.support_officers(id),
  due_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'DONE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tasks_assignee ON public.support_tasks(assigned_to_officer_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tasks_due ON public.support_tasks(due_at) WHERE status <> 'DONE';
ALTER TABLE public.support_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tasks REPLICA IDENTITY FULL;

-- ------------------------------------------------------------------------------
-- 7. KNOWLEDGE BASE + MACROS (trilingual by structure, spec §43/§45)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(32) NOT NULL,
  audience VARCHAR(32) NOT NULL DEFAULT 'INTERNAL_OFFICER' CHECK (audience IN (
    'CUSTOMER_FACING', 'INTERNAL_OFFICER', 'AGENT_OPERATOR', 'MERCHANT_SUPPORT'
  )),
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('PUBLISHED', 'DRAFT', 'ARCHIVED')),
  version VARCHAR(16) NOT NULL DEFAULT 'v1',
  author VARCHAR(255) NOT NULL,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  helpful_count INT NOT NULL DEFAULT 0,
  body_en JSONB NOT NULL,
  body_fr JSONB NOT NULL,
  body_ha JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_kb_status ON public.support_knowledge_articles(status);
CREATE INDEX IF NOT EXISTS idx_support_kb_category ON public.support_knowledge_articles(category);
ALTER TABLE public.support_knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.support_macros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(32) NOT NULL DEFAULT 'GENERAL',
  body_en TEXT NOT NULL,
  body_fr TEXT NOT NULL,
  body_ha TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.support_macros ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 8. CSAT + NOTIFICATIONS + AUDIT
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_csat_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  language VARCHAR(8) NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'fr', 'ha')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_csat_ticket ON public.support_csat_records(ticket_id);
ALTER TABLE public.support_csat_records ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.support_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(32) NOT NULL CHECK (type IN (
    'NEW_TICKET', 'TICKET_ASSIGNED', 'CUSTOMER_REPLY', 'SLA_WARNING',
    'SLA_BREACH', 'ESCALATION', 'DISPUTE_UPDATE', 'SYSTEM_ISSUE'
  )),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  href VARCHAR(255),
  -- Team-wide notification; per-officer read-state kept in a join table so
  -- one officer marking it read doesn't hide it from the rest of the team.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_notifications_recent ON public.support_notifications(created_at DESC);
ALTER TABLE public.support_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_notifications REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS public.support_notification_reads (
  notification_id UUID NOT NULL REFERENCES public.support_notifications(id) ON DELETE CASCADE,
  officer_id UUID NOT NULL REFERENCES public.support_officers(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (notification_id, officer_id)
);

ALTER TABLE public.support_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.support_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.support_officers(id),
  officer_name VARCHAR(255) NOT NULL,
  officer_role VARCHAR(32) NOT NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  details TEXT NOT NULL,
  before_state TEXT,
  after_state TEXT,
  jurisdiction VARCHAR(16) NOT NULL DEFAULT 'NG',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_audit_recent ON public.support_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_audit_entity ON public.support_audit_log(entity_type, entity_id);
ALTER TABLE public.support_audit_log ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 9. RETAINED OPERATIONAL MODULES — playbooks, incidents, automation, QA,
--    training, capacity. Read-mostly reference content; kept in their own
--    tables so they are real rows an ops/enablement user can maintain,
--    rather than a hardcoded module-level array.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  category VARCHAR(32) NOT NULL,
  target_tier VARCHAR(32) NOT NULL DEFAULT 'TIER_1_JUNIOR',
  estimated_minutes INT NOT NULL DEFAULT 10,
  required_role VARCHAR(32) NOT NULL DEFAULT 'TIER_1_JUNIOR',
  applicable_jurisdictions VARCHAR(16)[] NOT NULL DEFAULT ARRAY['NG','NE','CROSS_BORDER']::VARCHAR(16)[],
  steps JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.support_playbooks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.support_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number VARCHAR(32) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  affected_services TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  affected_providers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  jurisdiction VARCHAR(16) NOT NULL DEFAULT 'NG',
  severity VARCHAR(16) NOT NULL DEFAULT 'MINOR' CHECK (severity IN ('MINOR', 'MAJOR', 'CRITICAL')),
  status VARCHAR(16) NOT NULL DEFAULT 'INVESTIGATING' CHECK (status IN ('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED')),
  customer_notice TEXT,
  created_by_officer_id UUID REFERENCES public.support_officers(id),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.support_incidents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_incident_id_fkey') THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.support_incidents(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.support_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_event VARCHAR(64) NOT NULL,
  category VARCHAR(32) NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]'::JSONB,
  actions JSONB NOT NULL DEFAULT '[]'::JSONB,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  execution_count INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  last_triggered TIMESTAMPTZ,
  requires_human_approval BOOLEAN NOT NULL DEFAULT TRUE,
  is_dry_run BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.support_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.support_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.support_automation_rules(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  status VARCHAR(24) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING_APPROVAL', 'DRY_RUN_MATCH')),
  action_taken TEXT NOT NULL,
  time_saved_minutes INT NOT NULL DEFAULT 0,
  error TEXT,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_automation_logs_rule ON public.support_automation_logs(rule_id, triggered_at DESC);
ALTER TABLE public.support_automation_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.support_qa_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  officer_id UUID NOT NULL REFERENCES public.support_officers(id),
  reviewer_officer_id UUID NOT NULL REFERENCES public.support_officers(id),
  score NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  identity_verification SMALLINT NOT NULL CHECK (identity_verification BETWEEN 0 AND 100),
  accuracy SMALLINT NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
  professionalism SMALLINT NOT NULL CHECK (professionalism BETWEEN 0 AND 100),
  playbook_adherence SMALLINT NOT NULL CHECK (playbook_adherence BETWEEN 0 AND 100),
  resolution_speed SMALLINT NOT NULL CHECK (resolution_speed BETWEEN 0 AND 100),
  feedback TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_qa_officer ON public.support_qa_reviews(officer_id, reviewed_at DESC);
ALTER TABLE public.support_qa_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.support_training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  tier VARCHAR(32) NOT NULL DEFAULT 'TIER_1_JUNIOR',
  estimated_minutes INT NOT NULL DEFAULT 30,
  modules_count INT NOT NULL DEFAULT 1,
  certification_name VARCHAR(255),
  key_skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.support_training_modules ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.support_training_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.support_training_modules(id) ON DELETE CASCADE,
  officer_id UUID NOT NULL REFERENCES public.support_officers(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_id, officer_id)
);
ALTER TABLE public.support_training_completions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 10. IDEMPOTENCY (shared table across all support write routes, mirrors the
--     in-process idempotency map so retried requests are still safe after
--     this migration removes the module-level store).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_idempotency_keys (
  key VARCHAR(128) PRIMARY KEY,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_idempotency_created ON public.support_idempotency_keys(created_at);
ALTER TABLE public.support_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 11. NUMBER SEQUENCES — atomic, gap-tolerant, human-readable identifiers
--     (KP-SUP-####, DSC-2026-####, ESC-2026-####). Starting values continue
--     on from the numbers already visible in the retired seed data so any
--     screenshots/support docs referencing e.g. KP-SUP-10516 stay coherent.
-- ------------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_number_seq START WITH 10516;
CREATE SEQUENCE IF NOT EXISTS public.support_dispute_number_seq START WITH 35;
CREATE SEQUENCE IF NOT EXISTS public.support_escalation_number_seq START WITH 45;

CREATE OR REPLACE FUNCTION public.next_support_ticket_number() RETURNS VARCHAR
LANGUAGE sql AS $$
  SELECT 'KP-SUP-' || nextval('public.support_ticket_number_seq')::TEXT;
$$;

CREATE OR REPLACE FUNCTION public.next_support_dispute_number() RETURNS VARCHAR
LANGUAGE sql AS $$
  SELECT 'DSC-2026-' || LPAD(nextval('public.support_dispute_number_seq')::TEXT, 4, '0');
$$;

CREATE OR REPLACE FUNCTION public.next_support_escalation_number() RETURNS VARCHAR
LANGUAGE sql AS $$
  SELECT 'ESC-2026-' || LPAD(nextval('public.support_escalation_number_seq')::TEXT, 4, '0');
$$;

-- ------------------------------------------------------------------------------
-- 12. updated_at bookkeeping trigger — every mutable support table gets
--     updated_at bumped automatically so no route has to remember to set it.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.support_touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'support_officers', 'support_tickets', 'support_disputes', 'support_escalations',
    'support_tasks', 'support_knowledge_articles', 'support_macros',
    'support_playbooks', 'support_incidents', 'support_automation_rules'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_touch_updated_at ON public.%I;
       CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.support_touch_updated_at();',
      t, t
    );
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 13. SLA policy — a real table mirroring SUPPORT_SLA_POLICY, so the policy is
--     inspectable/administrable data rather than a hardcoded TS map. Routes
--     still compute the SLA snapshot at read time (never persisted as a
--     static status) — this table only supplies the minutes/hours inputs.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_sla_policy (
  priority VARCHAR(16) PRIMARY KEY CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL')),
  first_response_minutes INT NOT NULL,
  resolution_hours INT NOT NULL
);

INSERT INTO public.support_sla_policy (priority, first_response_minutes, resolution_hours) VALUES
  ('CRITICAL', 15, 4),
  ('URGENT', 30, 8),
  ('HIGH', 60, 24),
  ('NORMAL', 240, 72),
  ('LOW', 480, 96)
ON CONFLICT (priority) DO UPDATE SET
  first_response_minutes = EXCLUDED.first_response_minutes,
  resolution_hours = EXCLUDED.resolution_hours;

ALTER TABLE public.support_sla_policy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS support_sla_policy_read ON public.support_sla_policy;
CREATE POLICY support_sla_policy_read ON public.support_sla_policy
  FOR SELECT USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------------------------
-- 14. REALTIME publication — tickets/messages/escalations/disputes/
--     notifications already have REPLICA IDENTITY FULL; add them to the
--     existing supabase_realtime publication so the queue/inbox can update
--     live the same way the customer/agency portals do.
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_ticket_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_notifications;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_disputes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_disputes;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_escalations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_escalations;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tasks;
  END IF;
END $$;
