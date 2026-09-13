-- =============================================================================
-- 20260910 — REGIONAL MANAGER PORTAL
--
-- A Regional Manager (RM) supervises aggregators across their territory:
-- a region of Niger or a state (or set of states) of Nigeria. They are
-- network-level field operations staff — they do not belong to a single
-- aggregator (unlike aggregator_staff_users), so they get their own table.
--
-- Territory model: country + a list of state/region names, using the SAME
-- vocabulary as agents.state_or_region and aggregator_territories.state_or_region
-- (e.g. 'Kano State' NG, 'Maradi Region' NE). Scoping is done in SQL by
-- matching those names — never by free text elsewhere.
--
-- The table gets RLS (deny-all default): the portal's APIs run on the
-- service role, which bypasses RLS, exactly like every other persona table.
-- =============================================================================

create table if not exists public.regional_manager_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  full_name varchar(160) not null,
  email varchar(255) not null unique,
  phone varchar(32),
  country varchar(2) not null check (country in ('NG', 'NE')),
  territories text[] not null default '{}',
  status varchar(24) not null default 'ACTIVE'
    check (status in ('ACTIVE', 'SUSPENDED', 'INACTIVE')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.regional_manager_users is
  'Regional Managers supervise aggregators across a Niger region or Nigerian state(s). Territory names match agents.state_or_region / aggregator_territories.state_or_region.';

create index if not exists idx_regional_manager_users_auth
  on public.regional_manager_users (auth_user_id);

-- Deny-by-default posture from 20260910000040 applies to new tables too.
alter table public.regional_manager_users enable row level security;
