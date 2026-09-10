-- =============================================================================
-- 20260910 — CLOSE THE OPEN DATABASE PERIMETER
--
-- The review of 2026-09-10 proved that 196 of 295 public tables carried no
-- row-level security, and that with nothing but the public anon key the
-- identity register, the AML risk profiles and the workforce roster were
-- readable AND write-permitted from the open internet. All 37 public
-- functions — including SECURITY DEFINER money movers such as
-- post_customer_transfer / post_customer_fx_swap / approve_agent_float_topup
-- — were executable by anonymous callers.
--
-- This migration makes the default posture DENY:
--   1. every public table gets RLS (no policies = no anon/authenticated
--      access; the API layer's service-role connection bypasses RLS);
--   2. the anon role loses all write grants on public tables;
--   3. anon and authenticated lose EXECUTE on every public function —
--      every .rpc() caller in the codebase is server-side (service role),
--      verified before writing this.
--
-- Idempotent: safe to re-run. scripts/verify-rls.mjs asserts this posture
-- and fails CI if any table or function regresses.
-- =============================================================================

-- 1. Row-level security on every public table that lacks it.
do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security', r.relname);
  end loop;
end $$;

-- 2. The anon role never needs write access to public data.
do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('revoke insert, update, delete on public.%I from anon', r.relname);
  end loop;
end $$;

-- 3. No public function is callable by anon or authenticated: every RPC
--    caller in the application is a server-side route holding the service
--    role. Money-movement functions must never be reachable from a browser.
--    (Supabase grants EXECUTE via the PUBLIC role, so that is revoked too.)
revoke execute on all functions in schema public from public, anon, authenticated;

-- NOTE for future migrations: any new function must end with
--   revoke execute on function ... from public, anon, authenticated;
-- scripts/verify-rls.mjs fails the build if a regression slips in.

