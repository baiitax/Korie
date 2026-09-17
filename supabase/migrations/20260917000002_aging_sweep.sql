-- 20260917000002_aging_sweep.sql
-- Roadmap 3.3: the hourly support sweep needs per-row idempotency markers.
--
--   * maker_checker_requests.checker_reminded_at — set when an aging
--     reminder was actually delivered, so double-runs and hourly repeats
--     notify once per request, not once per hour.
--   * support_tasks.source_ref — a stable origin reference for
--     machine-created tasks (e.g. 'kyc-expiry:{document_id}'), so the KYC
--     expiry pass creates one task per document, ever.

BEGIN;

ALTER TABLE public.maker_checker_requests
  ADD COLUMN IF NOT EXISTS checker_reminded_at timestamp with time zone;

COMMENT ON COLUMN public.maker_checker_requests.checker_reminded_at IS
  'Set when the aging sweep delivered a >24h checker reminder for this request (roadmap 3.3). NULL = not yet reminded.';

ALTER TABLE public.support_tasks
  ADD COLUMN IF NOT EXISTS source_ref character varying;

COMMENT ON COLUMN public.support_tasks.source_ref IS
  'Stable origin reference for machine-created tasks, e.g. kyc-expiry:{document_id}. The sweep dedupes on this.';

CREATE INDEX IF NOT EXISTS support_tasks_source_ref_idx
  ON public.support_tasks (source_ref)
  WHERE source_ref IS NOT NULL;

COMMIT;
