-- =============================================================================
-- Day-0 hardening from the portal security review: SECURITY DEFINER functions
-- must never be executable by anon/authenticated through PostgREST.
--
-- Finding: Supabase's default privileges grant EXECUTE on new functions to
-- anon + authenticated directly, so REVOKE ... FROM PUBLIC alone is not
-- enough. post_dispute_resolution (posts wallet-credit journals) was
-- confirmed anon-reachable via /rest/v1/rpc (probe: domain error past auth,
-- not permission denied) with a caller-supplied officer id and no caller
-- verification. The month-end close functions and
-- record_dispute_non_financial_decision had the same exposure.
--
-- The application calls these via the service-role admin client only, so
-- this changes nothing for the app and everything for an attacker with the
-- public anon key.
--
-- hook_password_verification_attempt remains granted (invoked by the Supabase
-- auth service; verify GoTrue behavior before touching it) — flagged in the
-- roadmap instead.
--
-- Applied to production 2026-09-16 BEFORE this file was committed; verified:
-- anon probes now return 42501 permission denied.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.post_dispute_resolution(uuid, character varying, uuid, text, numeric) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_dispute_non_financial_decision(uuid, character varying, uuid, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.open_month_end_close(integer, integer, boolean, character varying) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_month_end_close_item(integer, integer, character varying, boolean, character varying, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prepare_month_end_close(integer, integer, boolean, character varying, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_month_end_close(integer, integer, boolean, character varying, character varying, text) FROM anon, authenticated, PUBLIC;

GRANT EXECUTE ON FUNCTION public.post_dispute_resolution(uuid, character varying, uuid, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_dispute_non_financial_decision(uuid, character varying, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.open_month_end_close(integer, integer, boolean, character varying) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_month_end_close_item(integer, integer, character varying, boolean, character varying, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_month_end_close(integer, integer, boolean, character varying, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_month_end_close(integer, integer, boolean, character varying, character varying, text) TO service_role;
