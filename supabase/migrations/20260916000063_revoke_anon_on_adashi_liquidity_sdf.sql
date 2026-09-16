-- =============================================================================
-- Portal security roadmap, CI-guardrail workstream (1.4): close the remaining
-- PS-1-class exposure found while building the migration linter.
--
-- Finding: six SECURITY DEFINER functions in the `adashi` and `liquidity`
-- schemas were executable by anon AND authenticated through PostgREST
-- (granted by 20260908000040's blanket exposure of those schemas), with NO
-- internal caller verification (no auth.uid()/JWT check in any of them).
-- That is the exact PS-1 class: anyone holding the public anon key could
-- call them directly via /rest/v1/rpc.
--
-- The application only ever calls these through the server-side admin client
-- (service_role) — every .schema("adashi"/"liquidity") call site in src/ is
-- an admin-client call — so revoking anon/authenticated changes nothing for
-- the app and everything for an attacker.
--
-- hook_password_verification_attempt (public schema) is deliberately NOT
-- touched here: it is invoked by the Supabase auth service and must be
-- verified with a manual login test before revoking (roadmap 1.2).
--
-- After this migration the ONLY SECURITY DEFINER function executable by
-- anon/authenticated in the entire database is that auth hook.
--
-- Applied to production 2026-09-16 BEFORE this file was committed; verified:
--  - live lint (scripts/lint-migrations.mjs --live): 0 violations,
--    allowlisted: public.hook_password_verification_attempt only;
--  - anon-key RPC probe via /rest/v1/rpc (Accept-Profile: adashi) now
--    returns PGRST202 not-in-schema-cache instead of executing.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION adashi.advance_adashi_cycle(uuid, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION adashi.create_adashi_cycles(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION adashi.generate_adashi_allocation(uuid, uuid, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION adashi.lock_membership(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION liquidity.consume_liquidity_reservation(uuid, numeric, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION liquidity.create_liquidity_reservation(uuid, numeric, text, text, text, uuid) FROM anon, authenticated, PUBLIC;

-- Belt and braces: make the service_role grants explicit so they survive any
-- future change to schema default privileges (they currently come from
-- 000040's ALTER DEFAULT PRIVILEGES ... TO anon, authenticated, service_role).
GRANT EXECUTE ON FUNCTION adashi.advance_adashi_cycle(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION adashi.create_adashi_cycles(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION adashi.generate_adashi_allocation(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION adashi.lock_membership(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION liquidity.consume_liquidity_reservation(uuid, numeric, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION liquidity.create_liquidity_reservation(uuid, numeric, text, text, text, uuid) TO service_role;

-- Ask PostgREST to drop the revoked functions from its API surface now
-- rather than waiting for its next poll interval.
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
