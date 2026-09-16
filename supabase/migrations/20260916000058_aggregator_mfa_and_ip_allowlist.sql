-- =============================================================================
-- 20260916000058_aggregator_mfa_and_ip_allowlist.sql
--
-- Portal hardening Phase B (F4) — aggregator account security parity.
--
-- MFA: aggregator staff MFA is implemented on top of Supabase Auth's own
-- native TOTP factor enrollment (auth.mfa.enroll/challenge/verify — the
-- same primitive Supabase Auth already ships, no bespoke secret storage
-- needed here). This migration adds exactly one column recording whether
-- an aggregator ORGANIZATION requires its staff to have a verified TOTP
-- factor before privileged (permission-gated) actions are allowed — the
-- actual verified-factor check itself is evaluated live against
-- auth.users.factors on every request (see
-- src/lib/security/aggregatorMfa.ts), never cached here, so a staff member
-- who later removes their factor loses the privilege immediately rather
-- than at next login.
--
-- IP allowlist: a new per-aggregator table of permitted CIDR ranges.
-- Optional/opt-in per the roadmap's acceptance criteria — an aggregator
-- with zero allowlist rows is NOT restricted (fail-open by absence, exactly
-- like every other optional control in this codebase, e.g. territory_scope
-- defaulting to '{}' meaning "no restriction" rather than "no access").
-- Once an aggregator adds at least one entry, sign-in/API access from any
-- other source IP is rejected for that aggregator's staff.
-- =============================================================================

ALTER TABLE public.aggregators
  ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.aggregators.mfa_required IS
  'When TRUE, every staff member of this aggregator must have a verified '
  'Supabase Auth TOTP factor to perform any aggregator.* permission-gated '
  'action (see requireAggregatorPermission / requireAggregatorMfa). Toggled '
  'by AGGREGATOR_OWNER/AGGREGATOR_ADMIN from /aggregator/security.';

-- NOTE: on this environment's live database, a table with this exact name
-- already existed (created by an earlier draft of this same migration,
-- before the column types below were tightened) with `cidr VARCHAR(64)`
-- and an extra `is_active BOOLEAN DEFAULT TRUE` column rather than a
-- native `CIDR` column. CREATE TABLE IF NOT EXISTS is therefore a no-op
-- there. Nothing below depends on `cidr` being the native Postgres CIDR
-- type — is_ip_allowed_for_aggregator() explicitly casts it — so the
-- varchar-typed table works identically; is_active (unused by the
-- application, which hard-deletes rows rather than soft-deleting them) is
-- simply carried along harmlessly on environments where it already exists.
CREATE TABLE IF NOT EXISTS public.aggregator_ip_allowlist (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id  UUID NOT NULL REFERENCES public.aggregators(id) ON DELETE CASCADE,
  cidr           VARCHAR(64) NOT NULL,
  label          VARCHAR(255),
  added_by_staff_id UUID REFERENCES public.aggregator_staff_users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aggregator_id, cidr)
);

CREATE INDEX IF NOT EXISTS idx_aggregator_ip_allowlist_aggregator
  ON public.aggregator_ip_allowlist(aggregator_id);

ALTER TABLE public.aggregator_ip_allowlist ENABLE ROW LEVEL SECURITY;

-- Staff can see their own aggregator's allowlist (read-only from the
-- client; all writes happen through the service-role-gated API route,
-- which itself calls requireAggregatorPermission before mutating).
DROP POLICY IF EXISTS aggregator_ip_allowlist_staff_select ON public.aggregator_ip_allowlist;
CREATE POLICY aggregator_ip_allowlist_staff_select ON public.aggregator_ip_allowlist
  FOR SELECT USING (
    aggregator_id IN (SELECT aggregator_id FROM public.aggregator_staff_users WHERE auth_user_id = auth.uid())
  );

-- No anon/authenticated INSERT/UPDATE/DELETE policy — every mutation goes
-- through the service-role API route so requireAggregatorPermission (and
-- the CIDR format validation living in application code) is always
-- enforced, mirroring aggregator_notifications/aggregator_devices' pattern
-- of read-only RLS + service-role-only writes.

-- -----------------------------------------------------------------------------
-- is_ip_allowed_for_aggregator — real CIDR containment check delegated to
-- Postgres's native inet/cidr operators (<<=), rather than reimplementing
-- IPv4/IPv6 range matching in application code (error-prone, especially for
-- IPv6). Returns TRUE (allowed) whenever the aggregator has NO allowlist
-- rows at all — the control is opt-in, so absence of configuration must
-- never silently lock an aggregator out of their own portal.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_ip_allowed_for_aggregator(p_aggregator_id UUID, p_ip TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_rules BOOLEAN;
  v_ip INET;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.aggregator_ip_allowlist WHERE aggregator_id = p_aggregator_id)
  INTO v_has_rules;

  IF NOT v_has_rules THEN
    RETURN TRUE; -- opt-in control: no rules configured means no restriction
  END IF;

  BEGIN
    v_ip := p_ip::INET;
  EXCEPTION WHEN OTHERS THEN
    -- Unparseable/missing IP (e.g. a proxy stripped the header) with an
    -- allowlist configured: fail CLOSED — an unverifiable origin must not
    -- bypass an explicitly configured restriction.
    RETURN FALSE;
  END;

  RETURN EXISTS(
    SELECT 1 FROM public.aggregator_ip_allowlist
    WHERE aggregator_id = p_aggregator_id AND v_ip <<= cidr::CIDR
  );
END;
$$;

COMMENT ON FUNCTION public.is_ip_allowed_for_aggregator(UUID, TEXT) IS
  'Opt-in per-aggregator IP allowlist check (Phase B / F4). TRUE when no '
  'rules exist for the aggregator (fail-open by absence) or the given IP '
  'matches a configured CIDR; FALSE (fail-closed) when rules exist and the '
  'IP does not match or could not be parsed.';
