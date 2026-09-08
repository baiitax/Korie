-- =============================================================================
-- Migration: 20260908000040_adashi_liquidity_postgrest_exposure.sql
-- Purpose:   Expose the adashi/liquidity schemas to PostgREST (Supabase's
--            REST layer) so the app's real Adashi routes — which call
--            admin.schema("adashi").from(...)/.rpc(...) via supabase-js —
--            can actually reach these tables/functions over the DB REST
--            API. Migration 027 created the schemas and RLS policies but
--            never (a) added them to the API's exposed-schemas list or
--            (b) granted the PostgREST roles (anon/authenticated/
--            service_role) USAGE + table/sequence/routine privileges,
--            which are enforced by Postgres independently of RLS. Without
--            this, every server-side call from the new agent/customer
--            Adashi routes fails with "permission denied for schema
--            adashi" even though service_role bypasses RLS.
--
--            This is purely a grants/exposure fix — no table structure,
--            data, or business logic changes.
-- =============================================================================

BEGIN;

-- Expose adashi + liquidity to PostgREST alongside the existing public schema.
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, adashi, liquidity, graphql_public';

-- Schema-level USAGE so the PostgREST roles can even see objects in these
-- schemas (service_role additionally bypasses RLS via rolbypassrls, but
-- still needs USAGE/GRANT to resolve objects at all).
GRANT USAGE ON SCHEMA adashi TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA liquidity TO anon, authenticated, service_role;

-- Table/sequence privileges — matches the existing public-schema grant
-- shape (all four roles get full DML; RLS policies on individual adashi.*
-- tables remain the real access-control layer for anon/authenticated).
GRANT ALL ON ALL TABLES IN SCHEMA adashi TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA adashi TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA liquidity TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA liquidity TO anon, authenticated, service_role;

-- Function execution — required for RPC calls like
-- adashi.lock_membership(), adashi.generate_adashi_allocation(),
-- adashi.create_adashi_cycles().
GRANT ALL ON ALL FUNCTIONS IN SCHEMA adashi TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA liquidity TO anon, authenticated, service_role;

-- Keep future objects in these schemas exposed automatically, exactly as
-- new public-schema objects already are.
ALTER DEFAULT PRIVILEGES IN SCHEMA adashi GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA adashi GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA adashi GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA liquidity GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA liquidity GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA liquidity GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- Ask PostgREST to reload its schema cache + config immediately rather
-- than waiting for its next poll interval.
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

COMMIT;
