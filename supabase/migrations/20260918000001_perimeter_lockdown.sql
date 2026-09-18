-- 20260918000001_perimeter_lockdown.sql
-- R-01 / F-01 remediation — Enterprise Risk Assessment 2026-09-18 (CRITICAL).
--
-- Evidence at time of writing (verified 2026-09-18, live PostgREST probes):
--   * public.control_approval_events — no RLS, full anon SELECT/INSERT/UPDATE/
--     DELETE: the maker-checker approval trail was publicly readable AND
--     writable with the anon key embedded in the customer web bundle
--     (probe returned HTTP 200 with full rows).
--   * public.control_policies — same: publicly writable. These rows drive
--     get_required_approvals() (dual-control thresholds), so a public write
--     is a direct control-weakening path, not just an evidence-integrity hit.
--   * public.agent_commission_rate_history — same (0 rows today).
--   * anon additionally held INSERT/UPDATE/DELETE grants on 6 further public
--     tables (RLS-blocked today, pure landmines) and TRUNCATE on ~304 tables
--     (RLS does not govern TRUNCATE; only the PostgREST surface, which does
--     not expose TRUNCATE, kept it unreachable).
--   * adashi/liquidity schemas: 25 further tables without RLS with
--     anon+authenticated grants. NOT exposed via PostgREST today (schema
--     cache = public only), but the same latent class.
--     (The `vault` schema is Supabase's platform-managed Secrets Vault,
--     owned by supabase_vault — anon already holds zero grants on it and
--     it is deliberately left to the platform.)
--   * authenticated held INSERT/UPDATE/DELETE on essentially every table
--     while ZERO write policies exist for it (all such grants are RLS-blocked
--     dead grants — one policy mistake away from becoming live write paths).
--   * 24 functions were executable by anon, including the money-movement
--     and control functions. 23 of them are non-SECURITY-DEFINER, are called
--     exclusively server-side via the service-role client, and already hold
--     explicit service_role EXECUTE grants. The 24th —
--     public.hook_password_verification_attempt — is the Supabase auth hook
--     and is DELIBERATELY LEFT UNTOUCHED until the roadmap 1.2 manual login
--     test confirms which role GoTrue invokes it as (it is allowlisted in
--     scripts/lint-migrations.mjs and scripts/verify-rls.mjs).
--
-- This migration makes the database perimeter DENY-BY-GRANT as well as
-- DENY-BY-POLICY (defense in depth), with provably no behaviour change:
--   1. RLS enabled on every app-schema table that lacks it (28 tables).
--   2. anon retains ZERO privileges on any table in public/adashi/liquidity.
--      anon already had zero policies (zero rows visible anywhere), so no
--      client behaviour can change.
--   3. authenticated keeps SELECT only on tables where a policy exists for
--      it (reads via RLS policies continue to work); every other grant is
--      revoked. All revoked grants were already RLS-blocked, so no client
--      behaviour can change. Client-role writes happen exclusively through
--      SECURITY DEFINER functions or the service-role path, unaffected here.
--   4. The 23 non-hook functions lose anon/authenticated/PUBLIC EXECUTE;
--      service_role keeps its explicit grants, and owners are unaffected.
--
-- Guard: scripts/verify-rls.mjs (extended in the same change) fails on any
-- regression of these invariants and MUST be run after applying migrations.

-- ─────────────────────────────────────────────────────────────────────────
-- 1) Enable RLS on every app-schema table that lacks it
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'adashi', 'liquidity')
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schema_name, r.table_name);
    RAISE NOTICE 'RLS enabled on %.%', r.schema_name, r.table_name;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2) anon: zero table/sequence privileges in every app schema
--    (anon has no RLS policies anywhere → it never legitimately sees a row)
-- ─────────────────────────────────────────────────────────────────────────
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA adashi FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA liquidity FROM anon;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA adashi FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA liquidity FROM anon;

-- ─────────────────────────────────────────────────────────────────────────
-- 3) authenticated: SELECT only where a policy exists for it; nothing else
--    anywhere. Every revoked grant was already blocked by RLS (deny-all on
--    non-policy tables; zero write policies exist for authenticated), so
--    this changes no client-visible behaviour — it only removes latent
--    grants.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t record;
  has_policy boolean;
BEGIN
  FOR t IN
    SELECT n.nspname AS schema_name, c.relname AS table_name, c.oid AS table_oid
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'adashi', 'liquidity')
      AND c.relkind = 'r'
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_policy p
      WHERE p.polrelid = t.table_oid
        AND 'authenticated'::regrole = ANY (p.polroles)
    ) INTO has_policy;

    IF has_policy THEN
      -- Keep SELECT (the policy scopes the rows); drop every write/DDL grant.
      EXECUTE format(
        'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON %I.%I FROM authenticated',
        t.schema_name, t.table_name
      );
    ELSE
      -- No policy for authenticated → every grant it holds here is dead.
      EXECUTE format(
        'REVOKE ALL ON %I.%I FROM authenticated',
        t.schema_name, t.table_name
      );
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4) Close anon access to the 23 non-hook functions.
--    Signatures generated from pg_get_function_identity_arguments() on
--    2026-09-18. service_role already holds explicit EXECUTE on each
--    (verified), and owners are unaffected by REVOKE.
--    NOTE: REVOKE FROM PUBLIC is required — Postgres grants function
--    EXECUTE to PUBLIC by default, and revoking from anon alone does not
--    remove access that flows through that default.
--    public.hook_password_verification_attempt is intentionally absent
--    (roadmap 1.2 pending).
-- ─────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION adashi.prohibit_locked_member_deletion() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION adashi.prohibit_published_allocation_mutation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION liquidity.prohibit_audit_log_mutation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public._execute_merchant_payout(p_request_id uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_merchant_payout(p_request_id uuid, p_approver_id uuid, p_decision character varying, p_notes text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decide_money_movement_request(p_request_id uuid, p_checker_id uuid, p_checker_email character varying, p_decision character varying, p_checker_notes text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_commission_rate_governance() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_fx_rate_governance() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_fx_rate_reciprocity() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_wallet_zero_opening() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_zero_opening_balance() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_required_approvals(p_policy_key character varying, p_org_id uuid, p_currency character varying, p_amount numeric) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_merchant_txn_cancellation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_ip_allowed_for_aggregator(p_aggregator_id uuid, p_ip text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_all_balances() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recognize_transfer_fee_revenue(p_customer_transaction_id uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_control_approval(p_approval_type character varying, p_reference_id uuid, p_actor_id character varying, p_decision character varying, p_notes text, p_actor_role character varying, p_org_id uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.request_merchant_payout(p_merchant_id uuid, p_requested_by uuid, p_amount numeric, p_idempotency_key character varying) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_cash_variance(p_reconciliation_id uuid, p_resolution character varying, p_posted_by character varying, p_notes text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_money_movement_request(p_action_type character varying, p_payload jsonb, p_maker_id uuid, p_maker_email character varying, p_maker_role character varying, p_maker_notes text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_account_balance_integrity() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_entry_account_balance() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_wallet_ledger_sync() FROM anon, authenticated, PUBLIC;

-- ─────────────────────────────────────────────────────────────────────────
-- 5) Post-fix assertions — the migration fails loudly if any invariant
--    does not hold when it completes.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  without_rls   integer;
  anon_privs    integer;
  auth_writes   integer;
  anon_funcs    integer;
BEGIN
  SELECT count(*) INTO without_rls
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'adashi', 'liquidity')
    AND c.relkind = 'r' AND NOT c.relrowsecurity;

  SELECT count(*) INTO anon_privs
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'adashi', 'liquidity')
    AND c.relkind = 'r'
    AND (has_table_privilege('anon', c.oid, 'SELECT')
      OR has_table_privilege('anon', c.oid, 'INSERT')
      OR has_table_privilege('anon', c.oid, 'UPDATE')
      OR has_table_privilege('anon', c.oid, 'DELETE')
      OR has_table_privilege('anon', c.oid, 'TRUNCATE'));

  SELECT count(*) INTO auth_writes
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'adashi', 'liquidity')
    AND c.relkind = 'r'
    AND (has_table_privilege('authenticated', c.oid, 'INSERT')
      OR has_table_privilege('authenticated', c.oid, 'UPDATE')
      OR has_table_privilege('authenticated', c.oid, 'DELETE')
      OR has_table_privilege('authenticated', c.oid, 'TRUNCATE'));

  SELECT count(*) INTO anon_funcs
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'adashi', 'liquidity')
    AND has_function_privilege('anon', p.oid, 'EXECUTE')
    AND p.proname <> 'hook_password_verification_attempt';

  IF without_rls > 0 THEN
    RAISE EXCEPTION 'perimeter_lockdown: % table(s) still without RLS', without_rls;
  END IF;
  IF anon_privs > 0 THEN
    RAISE EXCEPTION 'perimeter_lockdown: anon still holds privileges on % table(s)', anon_privs;
  END IF;
  IF auth_writes > 0 THEN
    RAISE EXCEPTION 'perimeter_lockdown: authenticated still holds write grants on % table(s)', auth_writes;
  END IF;
  IF anon_funcs > 0 THEN
    RAISE EXCEPTION 'perimeter_lockdown: anon can still EXECUTE % non-hook function(s)', anon_funcs;
  END IF;

  RAISE NOTICE 'perimeter_lockdown: all invariants hold (RLS everywhere, anon zero-access, authenticated read-only-via-policy, anon EXECUTE closed except the auth hook).';
END $$;
