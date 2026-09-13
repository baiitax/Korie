-- ==============================================================================
-- KORIEPAY — PER-ACCOUNT LOGIN LOCKOUT VIA SUPABASE PASSWORD VERIFICATION HOOK
-- Migration: 20260914000049_password_verification_lockout_hook.sql
-- ==============================================================================
--
-- Context (Task I / Phase 0-1, "registration/login abuse coverage"):
--
-- Every persona in this app (customer, agent, merchant, admin, compliance,
-- support) signs in through one shared client-side call —
-- `supabase.auth.signInWithPassword()` in src/components/auth/AuthContext.tsx
-- — straight to Supabase Auth's own hosted REST endpoint. None of our
-- Next.js API routes sit in front of it.
--
-- That means any brute-force throttle written in our own application code
-- (e.g. the dead `AuthService.checkRateLimit/recordFailedAttempt` in
-- src/lib/auth/authService.ts, never actually wired into AuthContext.login)
-- would run as plain browser JavaScript. An attacker doesn't need our UI at
-- all — they can call Supabase's `/auth/v1/token?grant_type=password`
-- directly with the public anon key. A client-side lockout would be
-- security theater: code that looks like a fix but enforces nothing,
-- because the client is never trusted per this program's core principle.
--
-- The real, non-bypassable enforcement point is Supabase Auth's own server.
-- It already rate-limits sign-in attempts per source IP (30 requests / 5
-- minutes by default — see https://supabase.com/docs/guides/auth/rate-limits),
-- which is NOT something this migration needs to duplicate.
--
-- The one gap that leaves open is PER-ACCOUNT protection against a
-- distributed / multi-IP credential-stuffing attack aimed at one specific
-- email — many source IPs, each under Supabase's per-IP cap, hammering the
-- same account. Supabase's answer to exactly this is the "Password
-- Verification Attempt" Auth Hook: a Postgres function Supabase Auth calls
-- synchronously on every password sign-in attempt (valid or not), which can
-- return `{"decision": "reject", ...}` to refuse the attempt server-side —
-- inside Supabase's own Auth flow, before a session is ever issued. This is
-- the mirror of what agent PIN brute-force protection already does
-- (src/app/api/v1/agency/settings/pin/route.ts), just at the Supabase-Auth
-- layer instead of our own API layer, because that's where this particular
-- credential check actually happens.
--
-- This migration creates the function and its supporting table. It does
-- NOT and CANNOT flip the project-level switch that tells Supabase Auth to
-- actually call this hook on every sign-in — that is a project **Auth
-- Hooks** setting (Dashboard: Authentication -> Hooks, or the separate
-- Supabase Management API with a personal access token), gated to
-- Teams/Enterprise plans, and neither is reachable via this direct
-- Postgres connection. See the operator note at the bottom of this file
-- for the exact activation step once plan/dashboard access is available.
-- ==============================================================================

-- One row per user; tracks a sliding failure count and an optional lockout
-- expiry. Mirrors the exact policy already designed (but never enforced)
-- in src/lib/auth/authService.ts: 5 consecutive failed attempts locks the
-- account for 15 minutes. A successful verification resets the counter.
--
-- Lives in `public` (not `auth`) because the connection used to run this
-- migration owns `public`, not the `auth` schema — only Supabase's own
-- supabase_admin/supabase_auth_admin roles can create objects inside
-- `auth` on a hosted project, and this matches Supabase's own official
-- example for this exact hook (see their Password Verification Hook
-- docs). RLS is enabled with no policies and all client-facing grants are
-- explicitly revoked below, so despite living in `public` this table is
-- unreachable through PostgREST/the anon or authenticated Supabase roles
-- — only supabase_auth_admin (via the hook) and the Postgres superuser
-- can touch it.
CREATE TABLE IF NOT EXISTS public.password_failed_verification_attempts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  failed_count INTEGER NOT NULL DEFAULT 0,
  last_failed_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ
);

ALTER TABLE public.password_failed_verification_attempts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.password_failed_verification_attempts IS
  'Backing store for public.hook_password_verification_attempt — per-account '
  'login lockout enforced inside Supabase Auth''s own password-verification '
  'flow (5 failed attempts -> 15 minute lockout, mirroring the policy in '
  'src/lib/auth/authService.ts). RLS enabled with zero policies and all '
  'client-role grants revoked below: only supabase_auth_admin (via the '
  'hook function) can read/write this table. No customer/agent/merchant '
  'data is stored here — user_id only.';

-- The hook itself lives in `public` (Supabase Auth Hooks must be callable
-- Postgres functions the auth admin role can execute; per Supabase's own
-- docs, supabase_auth_admin does not have implicit access to public, hence
-- the explicit grants below) but only ever reads/writes the table above —
-- no customer/agent/merchant data is touched by this function at all.

CREATE OR REPLACE FUNCTION public.hook_password_verification_attempt(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_valid BOOLEAN;
  v_row public.password_failed_verification_attempts;
  v_max_attempts CONSTANT INTEGER := 5;
  v_lockout_interval CONSTANT INTERVAL := INTERVAL '15 minutes';
BEGIN
  v_user_id := (event->>'user_id')::uuid;
  v_valid := (event->>'valid')::boolean;

  IF v_user_id IS NULL THEN
    -- Malformed event payload; do not block sign-in over our own bug.
    RETURN jsonb_build_object('decision', 'continue');
  END IF;

  SELECT * INTO v_row
  FROM public.password_failed_verification_attempts
  WHERE user_id = v_user_id;

  -- Already locked and the lockout has not expired yet: reject regardless
  -- of whether this particular password attempt was valid, so a correct
  -- password guessed mid-lockout still doesn't grant a session early.
  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > now() THEN
    RETURN jsonb_build_object(
      'decision', 'reject',
      'message', format(
        'Too many failed sign-in attempts. Please try again in %s minutes.',
        ceil(extract(epoch FROM (v_row.locked_until - now())) / 60)
      )
    );
  END IF;

  IF v_valid THEN
    -- Correct password: clear any tracked failures so a legitimate user
    -- who fat-fingered a password a couple of times isn't left with a
    -- lingering near-lockout state.
    DELETE FROM public.password_failed_verification_attempts WHERE user_id = v_user_id;
    RETURN jsonb_build_object('decision', 'continue');
  END IF;

  -- Wrong password: increment (or start) the counter for this account.
  INSERT INTO public.password_failed_verification_attempts (user_id, failed_count, last_failed_at, locked_until)
  VALUES (v_user_id, 1, now(), NULL)
  ON CONFLICT (user_id) DO UPDATE
    SET failed_count = public.password_failed_verification_attempts.failed_count + 1,
        last_failed_at = now(),
        locked_until = CASE
          WHEN public.password_failed_verification_attempts.failed_count + 1 >= v_max_attempts
            THEN now() + v_lockout_interval
          ELSE NULL
        END
  RETURNING * INTO v_row;

  IF v_row.locked_until IS NOT NULL THEN
    RETURN jsonb_build_object(
      'decision', 'reject',
      'message', 'Too many failed sign-in attempts. For your security, this account is temporarily locked for 15 minutes.'
    );
  END IF;

  -- Still under the threshold: let Supabase Auth's own default behavior
  -- (reject this one attempt with its normal invalid-credentials error)
  -- proceed.
  RETURN jsonb_build_object('decision', 'continue');
END;
$$;

COMMENT ON FUNCTION public.hook_password_verification_attempt IS
  'Supabase Auth "Password Verification Attempt" hook target. Enforces a '
  '5-failed-attempt / 15-minute per-account lockout server-side, inside '
  'Supabase Auth itself — this is the only enforcement point that cannot '
  'be bypassed by an attacker calling the Supabase REST API directly '
  '(never trust the client). NOT active until wired up as this project''s '
  'password_verification_attempt Auth Hook — see file header.';

-- Required so Supabase Auth's own service role can actually call this
-- function and touch its backing table (supabase_auth_admin has no
-- implicit rights into `public`, per Supabase's Auth Hooks documentation).
GRANT EXECUTE ON FUNCTION public.hook_password_verification_attempt TO supabase_auth_admin;
GRANT ALL ON TABLE public.password_failed_verification_attempts TO supabase_auth_admin;

-- Nobody else — including our own app's authenticated/anon Supabase roles
-- and the PostgREST-exposed API — should ever be able to read or clear
-- this table directly; it is exclusively the hook's own bookkeeping.
REVOKE ALL ON TABLE public.password_failed_verification_attempts FROM authenticated, anon, public;

-- ==============================================================================
-- OPERATOR ACTIVATION NOTE (cannot be done from this migration/DB connection):
--
-- This function and table are now live in the database, but Supabase Auth
-- will not call this hook until it is wired up as the project's Password
-- Verification Attempt hook. That is a Teams/Enterprise-plan project
-- setting, done either:
--   1. Dashboard: Authentication -> Hooks -> Password Verification Attempt
--      -> enable, function type "Postgres", select
--      public.hook_password_verification_attempt.
--   2. Or via the Supabase Management API with a personal access token
--      (PATCH /v1/projects/{ref}/config/auth with
--      hook_password_verification_attempt_enabled=true and
--      hook_password_verification_attempt_uri=
--      "pg-functions://postgres/public/hook_password_verification_attempt").
--
-- Until one of those is done, this migration has created a correct,
-- inert function — no behavior changes for any existing login flow.
-- ==============================================================================
