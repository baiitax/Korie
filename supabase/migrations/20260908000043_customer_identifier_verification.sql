-- ==============================================================================
-- KORIEPAY — CUSTOMER NATIONAL IDENTIFIER VERIFICATION (BVN/NIN/NIF/NNI)
-- Migration: 20260908000043_customer_identifier_verification.sql
-- ==============================================================================
--
-- CBN's tiered-KYC framework requires BVN and/or NIN linkage at every tier
-- (Tier 1: BVN or NIN; Tier 2/3: both) — see src/lib/compliance/tierLimits.ts.
-- BCEAO Instruction n°008-05-2015 Art. 27 requires identification against an
-- official document before an e-money account is opened in Niger (NIF/NNI is
-- the closest Nigerien analogue captured here for the XOF corridor).
--
-- public.customer_verification_status already existed (migration
-- 20260903000002) with the right shape — id_type/id_number_encrypted/
-- id_number_masked/verification_status — but nothing in the app ever read or
-- wrote it, and it had RLS enabled with zero policies (meaning even the
-- customer could never read their own row through anon/authenticated roles;
-- only the service-role client bypasses RLS, which is how the real API
-- routes below operate). This migration:
--   1. adds a customer self-select policy (mirrors customer_kyc_documents),
--   2. adds reviewer/rejection columns so admin/compliance review has
--      somewhere real to write its decision (audited, like every other
--      review queue in this codebase),
--   3. prevents duplicate *live* identifiers of the same type per customer,
--   4. keeps updated_at honest with a trigger, matching the rest of the schema.

ALTER TABLE public.customer_verification_status
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- A customer may have at most one *non-failed* identifier record per type
-- (BVN, NIN, …) — a fresh resubmission after a FAILED attempt is allowed,
-- but two live PENDING/VERIFIED/MANUAL_REVIEW rows of the same type would
-- be ambiguous for a reviewer. Enforced with a partial unique index instead
-- of a table constraint so retries after FAILED are not blocked.
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_verification_live_identifier
  ON public.customer_verification_status (customer_id, id_type)
  WHERE verification_status IN ('PENDING', 'VERIFIED', 'MANUAL_REVIEW');

CREATE OR REPLACE FUNCTION public.touch_customer_verification_status() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_customer_verification_status ON public.customer_verification_status;
CREATE TRIGGER trg_touch_customer_verification_status
  BEFORE UPDATE ON public.customer_verification_status
  FOR EACH ROW EXECUTE FUNCTION public.touch_customer_verification_status();

-- RLS: the row was previously unreadable by anyone but the service-role key.
-- The real API routes (customer capture, admin/compliance review) all use
-- the service-role client, so functionality was unaffected, but this closes
-- the gap for any future anon/authenticated-role access path and documents
-- the intended access shape explicitly.
DROP POLICY IF EXISTS customer_verification_status_self_select ON public.customer_verification_status;
CREATE POLICY customer_verification_status_self_select ON public.customer_verification_status
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
  );

-- PostgREST schema cache reload so the new columns are visible immediately
-- (see the Adashi migrations for why this matters on this project).
NOTIFY pgrst, 'reload schema';
