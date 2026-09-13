-- =============================================================================
-- 20260913 — REGIONAL PORTAL V2 (supervision expansion)
--
-- Adds the pieces the supervision spec requires that don't already exist:
--   1. An explicit permission set on regional_manager_users (least-privilege
--      regional.* keys — no admin.*, no ledger/wallet/balance writes).
--   2. regional_report_exports — an append-only audit record of every CSV a
--      manager exports (dataset, params, row count), used for rate limiting.
--   3. regional_escalation_keys — Idempot-Key dedupe so a retried escalation
--      POST can never file two support tickets.
--
-- Escalations themselves deliberately ride the EXISTING support system
-- (support_tickets + support_escalations): the manager gets a support_officers
-- row (the documented cross-desk pattern), files a real ticket, and raises a
-- real escalation routed to a control-function destination. No duplicate
-- escalation entity is created.
-- =============================================================================

-- 1. Permissions (least-privilege, server-enforced on every route).
alter table public.regional_manager_users
  add column if not exists permissions text[] not null default array[
    'regional.dashboard.view',
    'regional.aggregators.view',
    'regional.aggregators.performance.view',
    'regional.agents.view',
    'regional.customers.view_limited',
    'regional.merchants.view',
    'regional.transactions.view',
    'regional.liquidity.view',
    'regional.commissions.view',
    'regional.kyc.view',
    'regional.risk.view',
    'regional.support.manage',
    'regional.escalations.create',
    'regional.reports.view',
    'regional.reports.export',
    'regional.notifications.manage',
    'regional.search.use'
  ];

comment on column public.regional_manager_users.permissions is
  'Least-privilege permission keys enforced server-side on every /api/regional route. Deliberately excludes admin.*, ledger.write, wallet.write, balance.adjust, transaction.override.';

-- 2. Export audit + rate-limit ledger.
create table if not exists public.regional_report_exports (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references public.regional_manager_users(id),
  dataset varchar(64) not null,
  params jsonb not null default '{}'::jsonb,
  row_count integer not null default 0,
  status varchar(24) not null default 'GENERATED'
    check (status in ('GENERATED', 'FAILED')),
  ip_address varchar(64),
  created_at timestamptz not null default now()
);

create index if not exists idx_regional_report_exports_manager
  on public.regional_report_exports (manager_id, created_at desc);

-- 3. Idempotency keys for escalation creation.
create table if not exists public.regional_escalation_keys (
  key varchar(120) primary key,
  manager_id uuid not null references public.regional_manager_users(id),
  ticket_id uuid not null references public.support_tickets(id),
  created_at timestamptz not null default now()
);

alter table public.regional_report_exports enable row level security;
alter table public.regional_escalation_keys enable row level security;
