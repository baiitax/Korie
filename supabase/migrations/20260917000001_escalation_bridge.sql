-- 20260917000001_escalation_bridge.sql
-- Roadmap 3.1 (PS-6): escalation bridge — when support escalates a ticket to
-- COMPLIANCE or FRAUD_RISK, a real aml_alerts referral row is created and
-- linked both ways with the support escalation.
--
-- Design notes:
--   * support_escalations.external_ref holds the created alert_reference
--     (the compliance side of the linkage; the support side is
--     aml_alerts.source_reference = escalation_number).
--   * aml_alerts.source_reference gets a UNIQUE index so the bridge is
--     idempotent at the database level: racing/retrying bridge runs cannot
--     create a second referral alert for the same escalation.
--   * A new aml_scenarios row SUPPORT_ESC_01 classifies these alerts as
--     officer referrals (NOT engine detections). is_active = FALSE so the
--     automated monitoring sweep never evaluates it as a threshold scenario —
--     it exists as classification configuration only, like the scenario rows
--     seeded with the AML engine.

BEGIN;

-- The scenario category enum gains SUPPORT_REFERRAL: a referral class is not
-- an engine detection class, and misfiling referrals under an engine category
-- (e.g. CASH_ANOMALY) would be a lie in the data. The constraint is replaced
-- with the identical list plus the new value.
ALTER TABLE public.aml_scenarios
  DROP CONSTRAINT aml_scenarios_category_check;
ALTER TABLE public.aml_scenarios
  ADD CONSTRAINT aml_scenarios_category_check CHECK (
    category::text = ANY (ARRAY[
      'STRUCTURING'::character varying,
      'VELOCITY'::character varying,
      'PASS_THROUGH'::character varying,
      'DORMANT_REACTIVATION'::character varying,
      'CASH_ANOMALY'::character varying,
      'GRAPH_CIRCULAR'::character varying,
      'MULE_RING'::character varying,
      'CROSS_BORDER_FX'::character varying,
      'SUPPORT_REFERRAL'::character varying
    ]::text[])
  );

ALTER TABLE public.support_escalations
  ADD COLUMN IF NOT EXISTS external_ref character varying;

COMMENT ON COLUMN public.support_escalations.external_ref IS
  'Compliance-side linkage: the aml_alerts.alert_reference created by the escalation bridge (roadmap 3.1). NULL = not bridged (or destination outside COMPLIANCE/FRAUD_RISK).';

ALTER TABLE public.aml_alerts
  ADD COLUMN IF NOT EXISTS source_reference character varying;

COMMENT ON COLUMN public.aml_alerts.source_reference IS
  'Where this alert came from: the support escalation_number for officer referrals (SUPPORT_ESC_01), NULL for engine-detected alerts.';

CREATE UNIQUE INDEX IF NOT EXISTS aml_alerts_source_reference_key
  ON public.aml_alerts (source_reference)
  WHERE source_reference IS NOT NULL;

INSERT INTO public.aml_scenarios (
  id, scenario_code, name, description, category, severity, jurisdiction,
  is_active, version, threshold_amount, time_window_seconds, rule_config
) VALUES (
  '8f0f2a5e-0000-4000-8000-726566657272',
  'SUPPORT_ESC_01',
  'Support-Referred Risk Escalation',
  'Officer referral: a support officer escalated a ticket to COMPLIANCE or FRAUD_RISK. Not engine-detected — the alert records an officer''s judgment that the matter needs compliance review, with the ticket and escalation references in the alert narrative.',
  'SUPPORT_REFERRAL',
  'P1_HIGH',
  'GLOBAL',
  FALSE,
  1,
  NULL,
  0,
  '{}'::jsonb
) ON CONFLICT (scenario_code) DO NOTHING;

COMMIT;
