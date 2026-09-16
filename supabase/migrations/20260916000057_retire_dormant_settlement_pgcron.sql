-- =============================================================================
-- 20260916000057_retire_dormant_settlement_pgcron.sql
--
-- Portal hardening Phase D (F5/F6) — settlement automation, step 3/4:
-- "retire (or leave inert, clearly commented) the pg_cron block ... so
-- there's exactly one source of truth for how settlement actually gets
-- triggered instead of two (one dormant, one real)."
--
-- 20260906000029_agency_transfers_settlement_kyc_realtime.sql scheduled
-- run_daily_settlement() via pg_cron for exactly two hardcoded orgs
-- (NG/NGN, NE/XOF) inside a DO block wrapped in EXCEPTION WHEN OTHERS ->
-- NULL. On this Supabase plan pg_cron is not enabled, so that block has
-- always silently no-op'd — every job it "scheduled" never actually ran.
--
-- The real trigger is now GET /api/cron/settlement (Vercel cron, 23:55
-- daily, CRON_SECRET-gated — see vercel.json and
-- src/app/api/cron/settlement/route.ts), which enumerates every real
-- (org_id, currency) pair with EARNED/PENDING_SETTLEMENT commissions
-- dynamically instead of hardcoding two IDs, so newly onboarded orgs are
-- covered automatically.
--
-- This migration unschedules the dormant jobs defensively (in case pg_cron
-- ever IS enabled on a future plan tier and those two jobs silently started
-- firing, which would double-trigger settlement alongside the Vercel cron
-- — harmless given run_daily_settlement's own idempotency, but confusing
-- to debug) and leaves a clear, permanent comment recording why. No new
-- schedule is created here on purpose: the Vercel cron above is the one
-- and only source of truth going forward.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('koriepay-daily-settlement-ng')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'koriepay-daily-settlement-ng');
    PERFORM cron.unschedule('koriepay-daily-settlement-ne')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'koriepay-daily-settlement-ne');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron extension not present/permitted on this plan (expected) — the
  -- jobs never existed to unschedule in the first place. No-op.
  NULL;
END $$;

COMMENT ON FUNCTION public.run_daily_settlement(uuid, character varying, date) IS
  'Idempotent per (org_id, currency, settlement_date) — re-calling it for an '
  'already-posted day returns the existing batch rather than double-settling. '
  'Scheduled exclusively via GET /api/cron/settlement (Vercel cron, CRON_SECRET-'
  'gated, 23:55 daily UTC, dynamic org/currency enumeration) as of 2026-09-16. '
  'The pg_cron schedule attempted in 20260906000029_agency_transfers_settlement_'
  'kyc_realtime.sql for two hardcoded orgs was always dormant on this plan and '
  'is retired by 20260916000057_retire_dormant_settlement_pgcron.sql — do not '
  're-add a pg_cron schedule for this function without removing the Vercel cron '
  'first, to keep exactly one source of truth for when settlement runs.';
