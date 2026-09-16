-- =============================================================================
-- 20260914000055_fx_rate_admin.sql
--
-- FX rate administration (assessment F18 / RISK-12 / B7 part 1: "sourced
-- rates + validation + history"; §44 rate-governance row).
--
--   S1  Split the fx_rates governance trigger. Actor attribution and the
--       fx_rate_history snapshot stay immediate (enforce_fx_rate_governance,
--       body edited, signature unchanged). The 1%-reciprocity check moves to
--       a DEFERRABLE INITIALLY DEFERRED constraint trigger that validates
--       the pair's FINAL state at commit — the same pattern the ledger uses
--       for its balance-derivation invariants. Under the old immediate
--       per-row check, any re-rate beyond 1% was structurally impossible
--       (each row was validated against the other's not-yet-updated value),
--       so the two seeded rates could never be corrected at all.
--   S2  update_fx_rate_pair (new): the sanctioned re-rate path. Sets the
--       forward rate and auto-derives the reverse as 1/rate, so pairs are
--       reciprocal BY CONSTRUCTION and no unbooked spread can be introduced
--       through the rate table. Requires an actor (uuid), a rate source
--       (provenance — F18's "no rate source" finding), validates bounds,
--       snapshots both rows into fx_rate_history via the governance trigger
--       and writes a central audit_events row.
--   S3  fx-rate-history read resource support (table already exists).
--
-- No existing function signature changes.
-- =============================================================================

-- =============================================================================
-- S1. Governance split
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_fx_rate_governance()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Every rate change must be attributed to an actor.
    IF NEW.updated_by IS NULL AND OLD.updated_by IS NULL THEN
      RAISE EXCEPTION 'FX_RATE_UPDATE_REQUIRES_ACTOR: set updated_by when changing rates';
    END IF;
    IF NEW.rate IS DISTINCT FROM OLD.rate THEN
      INSERT INTO public.fx_rate_history (source_currency, destination_currency, old_rate, new_rate, changed_by)
      VALUES (OLD.source_currency, OLD.destination_currency, OLD.rate, NEW.rate, NEW.updated_by);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Reciprocity as a deferred constraint trigger: fires at COMMIT against the
-- pair's final state, so a two-row pair re-rate is atomic and still checked.
CREATE OR REPLACE FUNCTION public.enforce_fx_rate_reciprocity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_reverse NUMERIC;
BEGIN
  SELECT rate INTO v_reverse
  FROM public.fx_rates
  WHERE source_currency = NEW.destination_currency
    AND destination_currency = NEW.source_currency
    AND id <> NEW.id;
  IF v_reverse IS NOT NULL AND abs(NEW.rate * v_reverse - 1) > 0.01 THEN
    RAISE EXCEPTION 'FX_RATE_PAIR_NOT_RECIPROCAL: %->% rate % x reverse % = % (must be within 1%% of 1)',
      NEW.source_currency, NEW.destination_currency, NEW.rate, v_reverse, NEW.rate * v_reverse;
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_fx_rate_reciprocity ON public.fx_rates;
CREATE CONSTRAINT TRIGGER trg_fx_rate_reciprocity
  AFTER INSERT OR UPDATE ON public.fx_rates
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_fx_rate_reciprocity();

-- =============================================================================
-- S2. Sanctioned pair re-rate
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_fx_rate_pair(
  p_source_currency character varying,
  p_destination_currency character varying,
  p_new_rate numeric,
  p_updated_by uuid,
  p_rate_source text DEFAULT NULL,
  p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_forward public.fx_rates;
  v_reverse_row public.fx_rates;
  v_reverse_rate NUMERIC;
  v_actor_email TEXT;
  v_old_forward_rate NUMERIC;
  v_old_reverse_rate NUMERIC;
  v_org_id UUID;
BEGIN
  IF p_updated_by IS NULL THEN
    RAISE EXCEPTION 'FX_RATE_ACTOR_REQUIRED';
  END IF;
  IF p_rate_source IS NULL OR length(trim(p_rate_source)) < 4 THEN
    RAISE EXCEPTION 'FX_RATE_SOURCE_REQUIRED: state where the rate comes from (e.g. CBN-DAILY-2026-09-14, BCCEAU-DAILY, DESK-MANUAL-YYYY-MM-DD)';
  END IF;
  IF p_new_rate IS NULL OR p_new_rate <= 0 OR p_new_rate > 1000000 THEN
    RAISE EXCEPTION 'FX_RATE_INVALID: rate must be a positive number up to 1,000,000';
  END IF;
  IF p_source_currency = p_destination_currency THEN
    RAISE EXCEPTION 'FX_RATE_INVALID: source and destination currency must differ';
  END IF;

  SELECT * INTO v_forward FROM public.fx_rates
  WHERE source_currency = p_source_currency AND destination_currency = p_destination_currency
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FX_RATE_PAIR_NOT_FOUND: % -> %', p_source_currency, p_destination_currency;
  END IF;

  SELECT * INTO v_reverse_row FROM public.fx_rates
  WHERE source_currency = p_destination_currency AND destination_currency = p_source_currency
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FX_RATE_PAIR_NOT_FOUND: reverse % -> %', p_destination_currency, p_source_currency;
  END IF;

  v_old_forward_rate := v_forward.rate;
  v_old_reverse_rate := v_reverse_row.rate;
  v_reverse_rate := round(1 / p_new_rate, 6);

  UPDATE public.fx_rates
  SET rate = p_new_rate, source = trim(p_rate_source), updated_by = p_updated_by, updated_at = NOW()
  WHERE id = v_forward.id
  RETURNING * INTO v_forward;

  UPDATE public.fx_rates
  SET rate = v_reverse_rate, source = trim(p_rate_source), updated_by = p_updated_by, updated_at = NOW()
  WHERE id = v_reverse_row.id
  RETURNING * INTO v_reverse_row;

  SELECT email INTO v_actor_email FROM public.user_profiles WHERE auth_user_id = p_updated_by;
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;

  INSERT INTO public.audit_events (org_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (
    v_org_id,
    p_updated_by,
    COALESCE(v_actor_email, p_updated_by::text),
    'ADMIN',
    'FX_RATE_UPDATE',
    'fx_rates',
    v_forward.id::text,
    jsonb_build_object(
      'pair', p_source_currency || '->' || p_destination_currency,
      'old_forward_rate', v_old_forward_rate,
      'new_forward_rate', v_forward.rate,
      'old_reverse_rate', v_old_reverse_rate,
      'new_reverse_rate', v_reverse_row.rate,
      'rate_source', trim(p_rate_source),
      'notes', p_notes
    ),
    'admin-console',
    'FXRATE-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
    'FXRATE-' || v_forward.id::text
  );

  RETURN jsonb_build_object(
    'forward', to_jsonb(v_forward),
    'reverse', to_jsonb(v_reverse_row),
    'old_forward_rate', v_old_forward_rate,
    'old_reverse_rate', v_old_reverse_rate,
    'history_rows_added', (v_old_forward_rate IS DISTINCT FROM v_forward.rate)::int
                        + (v_old_reverse_rate IS DISTINCT FROM v_reverse_row.rate)::int
  );
END;
$function$;
