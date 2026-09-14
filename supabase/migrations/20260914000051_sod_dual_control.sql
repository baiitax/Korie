-- =============================================================================
-- 20260914000051_sod_dual_control.sql
--
-- Segregation-of-duties remediation for the money paths (assessment §43:
-- "SoD is degenerate — approval as a control step does not exist on money
-- paths"). Implements the recommended minimum matrix: amount-tiered
-- maker + checker with audit events and no self-approval anywhere.
--
--   S1  control_policies — amount-tiered dual-control thresholds
--       (org-specific rows override the global org-NULL row)
--   S2  control_approval_events + record_control_approval() — the audit
--       trail of who approved/rejected what, with distinct-approver counts
--   S3  approve_agent_float_topup v3 — above the threshold a second,
--       DIFFERENT reviewer must approve before treasury money moves
--       (signature unchanged; new status PENDING_SECOND_APPROVAL)
--   S4  request_merchant_payout v2 + approve_merchant_payout (new) +
--       _execute_merchant_payout (new) — above the threshold a merchant
--       payout NO LONGER moves money on request: it waits for the required
--       number of distinct internal approvers, none of whom may be the
--       requester (signature unchanged; new status PENDING_APPROVAL)
--   S5  agent_commission_rates governance — updated_by required on fee/
--       commission changes, full before/after history
--
-- Adashi payouts already enforce maker≠checker (post_adashi_payout →
-- PENDING → authorize_adashi_payout → SEGREGATION_OF_DUTIES_VIOLATION on
-- self-approval) with product-configured thresholds; nothing to add there.
--
-- No existing function signature changes — all app RPC calls keep working.
-- =============================================================================

-- =============================================================================
-- S0. Extend status domains for the new approval states
-- =============================================================================

-- The new status value is 23 chars; the original column was varchar(16).
ALTER TABLE public.agent_float_topup_requests ALTER COLUMN status TYPE CHARACTER VARYING(32);

ALTER TABLE public.agent_float_topup_requests DROP CONSTRAINT IF EXISTS agent_float_topup_requests_status_check;
ALTER TABLE public.agent_float_topup_requests
  ADD CONSTRAINT agent_float_topup_requests_status_check CHECK (
    status IN ('PENDING', 'PENDING_SECOND_APPROVAL', 'PROCESSING', 'APPROVED', 'REJECTED')
  );

ALTER TABLE public.merchant_payout_requests DROP CONSTRAINT IF EXISTS merchant_payout_requests_status_check;
ALTER TABLE public.merchant_payout_requests
  ADD CONSTRAINT merchant_payout_requests_status_check CHECK (
    status IN ('PENDING_APPROVAL', 'PENDING_PROVIDER_INTEGRATION', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')
  );

-- =============================================================================
-- S1. Amount-tiered dual-control policies
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.control_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key CHARACTER VARYING(64) NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL = applies to every org
  currency CHARACTER VARYING(3) NOT NULL DEFAULT 'NGN',
  threshold_amount NUMERIC(24,2) NOT NULL CHECK (threshold_amount >= 0),
  required_approvals INT NOT NULL DEFAULT 2 CHECK (required_approvals >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by CHARACTER VARYING(128),
  UNIQUE (policy_key, org_id, currency)
);

COMMENT ON TABLE public.control_policies IS 'Amount-tiered segregation-of-duties policies: at or above threshold_amount, the listed money movement requires required_approvals distinct approvers. Org-specific rows override the global (org_id NULL) row.';

INSERT INTO public.control_policies (policy_key, org_id, currency, threshold_amount, required_approvals, updated_by)
VALUES
  ('AGENT_FLOAT_TOPUP_DUAL_CONTROL', NULL, 'NGN', 1000000.00, 2, 'migration-20260914000051'),
  ('MERCHANT_PAYOUT_DUAL_CONTROL',   NULL, 'NGN', 250000.00,  2, 'migration-20260914000051')
ON CONFLICT (policy_key, org_id, currency) DO NOTHING;

-- Resolve how many distinct approvals a money movement requires.
-- Below the threshold (or with no active policy): 1 (the existing single-approval flow).
CREATE OR REPLACE FUNCTION public.get_required_approvals(
  p_policy_key character varying,
  p_org_id uuid,
  p_currency character varying,
  p_amount numeric)
RETURNS INT
LANGUAGE sql
STABLE
AS $function$
  SELECT CASE
    WHEN COALESCE(p_amount, 0) < COALESCE(org_specific.threshold_amount, global_policy.threshold_amount, 0) THEN 1
    ELSE COALESCE(org_specific.required_approvals, global_policy.required_approvals, 1)
  END
  FROM (SELECT NULL::public.control_policies AS dummy) _
  LEFT JOIN public.control_policies org_specific
    ON org_specific.policy_key = p_policy_key
   AND org_specific.org_id = p_org_id
   AND org_specific.currency = p_currency
   AND org_specific.is_active
  LEFT JOIN public.control_policies global_policy
    ON global_policy.policy_key = p_policy_key
   AND global_policy.org_id IS NULL
   AND global_policy.currency = p_currency
   AND global_policy.is_active
  LIMIT 1;
$function$;

-- =============================================================================
-- S2. Approval audit trail
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.control_approval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_type CHARACTER VARYING(64) NOT NULL,
  reference_id UUID NOT NULL,
  org_id UUID,
  actor_id CHARACTER VARYING(64) NOT NULL,
  actor_role CHARACTER VARYING(64),
  decision CHARACTER VARYING(16) NOT NULL CHECK (decision IN ('SUBMIT', 'APPROVE', 'REJECT')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_control_approval_events_ref
  ON public.control_approval_events (approval_type, reference_id);

COMMENT ON TABLE public.control_approval_events IS 'Four-eyes audit trail: every approve/reject decision on a controlled money movement, with the distinct-approver count used by the posting functions.';

-- Record a decision and return the number of DISTINCT actors who have
-- approved this reference so far (a repeat approval by the same actor does
-- not advance the count — four eyes means four different eyes).
CREATE OR REPLACE FUNCTION public.record_control_approval(
  p_approval_type character varying,
  p_reference_id uuid,
  p_actor_id character varying,
  p_decision character varying,
  p_notes text DEFAULT NULL,
  p_actor_role character varying DEFAULT NULL,
  p_org_id uuid DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
AS $function$
DECLARE
  v_count INT;
BEGIN
  IF p_decision NOT IN ('APPROVE', 'REJECT') THEN
    RAISE EXCEPTION 'INVALID_APPROVAL_DECISION_%', p_decision;
  END IF;
  IF p_actor_id IS NULL OR length(trim(p_actor_id)) = 0 THEN
    RAISE EXCEPTION 'APPROVAL_ACTOR_REQUIRED';
  END IF;

  INSERT INTO public.control_approval_events (approval_type, reference_id, org_id, actor_id, actor_role, decision, notes)
  VALUES (p_approval_type, p_reference_id, p_org_id, p_actor_id, p_actor_role, p_decision, p_notes);

  SELECT COUNT(DISTINCT actor_id) INTO v_count
  FROM public.control_approval_events
  WHERE approval_type = p_approval_type
    AND reference_id = p_reference_id
    AND decision = 'APPROVE';

  RETURN v_count;
END;
$function$;

-- =============================================================================
-- S3. approve_agent_float_topup v3 — dual control above the threshold
--     (signature unchanged). Below the threshold: unchanged single-approval
--     behaviour. At/above it: the first approval parks the request in
--     PENDING_SECOND_APPROVAL (no money moves); a second, DIFFERENT reviewer
--     completing the approval posts the funding journal.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.approve_agent_float_topup(p_request_id uuid, p_reviewer_id uuid)
 RETURNS agent_float_topup_requests
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_request public.agent_float_topup_requests;
  v_org_id UUID;
  v_wallet_float_id UUID;
  v_treasury_account_id UUID;
  v_ledger_tx_id UUID;
  v_required INT;
  v_approvers INT;
BEGIN
  SELECT * INTO v_request FROM public.agent_float_topup_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOPUP_REQUEST_NOT_FOUND';
  END IF;
  IF v_request.status NOT IN ('PENDING', 'PENDING_SECOND_APPROVAL') THEN
    RAISE EXCEPTION 'TOPUP_REQUEST_ALREADY_DECIDED';
  END IF;

  SELECT org_id INTO v_org_id FROM public.agents WHERE id = v_request.agent_id;

  SELECT la.id INTO v_wallet_float_id
  FROM public.agent_float_accounts afa
  JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
  WHERE afa.agent_id = v_request.agent_id AND afa.account_kind = 'WALLET_FLOAT' AND afa.currency = v_request.currency
  FOR UPDATE OF la;

  IF v_wallet_float_id IS NULL THEN
    RAISE EXCEPTION 'AGENT_FLOAT_NOT_PROVISIONED';
  END IF;

  -- Treasury funding accounts are one per country+currency (account_number is
  -- globally unique), so look it up without the org filter — an agent from a
  -- second NG org must reuse the same treasury, not collide on insert.
  SELECT id INTO v_treasury_account_id FROM public.ledger_accounts
  WHERE currency = v_request.currency
    AND account_number = 'TREASURY-' || (SELECT country FROM public.organizations WHERE id = v_org_id) || '-AGENT-FUNDING';

  IF v_treasury_account_id IS NULL THEN
    INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
    VALUES (
      v_org_id,
      'TREASURY-' || (SELECT country FROM public.organizations WHERE id = v_org_id) || '-AGENT-FUNDING',
      'Treasury — Agent Float Funding',
      'EQUITY', v_request.currency, (SELECT country FROM public.organizations WHERE id = v_org_id), 0
    )
    RETURNING id INTO v_treasury_account_id;
  END IF;

  PERFORM 1 FROM public.ledger_accounts WHERE id = v_treasury_account_id FOR UPDATE;

  -- ---- Four-eyes policy: how many distinct reviewers must approve? ----
  v_required := public.get_required_approvals('AGENT_FLOAT_TOPUP_DUAL_CONTROL', v_org_id, v_request.currency, v_request.amount);

  IF v_required > 1 THEN
    -- No self-stacking: if this reviewer already approved and the count is
    -- still short, a repeat approval can never satisfy the policy.
    IF EXISTS (
      SELECT 1 FROM public.control_approval_events
      WHERE approval_type = 'AGENT_FLOAT_TOPUP' AND reference_id = v_request.id
        AND actor_id = p_reviewer_id::text AND decision = 'APPROVE'
    ) THEN
      RAISE EXCEPTION 'SECOND_APPROVER_MUST_BE_A_DIFFERENT_USER';
    END IF;

    v_approvers := public.record_control_approval(
      'AGENT_FLOAT_TOPUP', v_request.id, p_reviewer_id::text, 'APPROVE',
      'Float top-up approval (dual control)', 'BACK_OFFICE', v_org_id);

    IF v_approvers < v_required THEN
      UPDATE public.agent_float_topup_requests
      SET status = 'PENDING_SECOND_APPROVAL', reviewed_by = p_reviewer_id, reviewed_at = NOW()
      WHERE id = p_request_id
      RETURNING * INTO v_request;
      RETURN v_request; -- first approval recorded; treasury money has NOT moved
    END IF;
    -- else: the required number of distinct reviewers has approved — fall
    -- through and post the funding journal.
  END IF;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_org_id, 'FTU-' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '-' || UPPER(SUBSTRING(p_request_id::text, 1, 6)), 'Agent float top-up approved', v_request.amount, v_request.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_treasury_account_id, 'DEBIT', v_request.amount, v_request.currency, 'Treasury funds agent float top-up'),
    (v_ledger_tx_id, v_wallet_float_id, 'CREDIT', v_request.amount, v_request.currency, 'Agent wallet float credited from approved top-up');

  -- Treasury is DEBITED, so its balance decreases (equity drawn down).
  UPDATE public.ledger_accounts SET balance = balance - v_request.amount, updated_at = NOW() WHERE id = v_treasury_account_id;
  UPDATE public.ledger_accounts SET balance = balance + v_request.amount, updated_at = NOW() WHERE id = v_wallet_float_id;

  UPDATE public.agent_float_topup_requests
  SET status = 'APPROVED', reviewed_by = p_reviewer_id, reviewed_at = NOW(), ledger_transaction_id = v_ledger_tx_id
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  RETURN v_request;
END;
$function$;

-- =============================================================================
-- S4. Merchant payouts: approval gate above the threshold
-- =============================================================================

-- Posts the payout journal (settlement DEBIT / payout clearing CREDIT),
-- re-checking sufficiency under lock. Called by request_merchant_payout for
-- below-threshold requests and by approve_merchant_payout once the required
-- approvals are in. Internal helper — not part of the app RPC surface.
CREATE OR REPLACE FUNCTION public._execute_merchant_payout(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_request public.merchant_payout_requests;
  v_org_id UUID;
  v_settlement_account_id UUID;
  v_settlement_balance NUMERIC(24,2);
  v_clearing_account_id UUID;
  v_ledger_tx_id UUID;
BEGIN
  SELECT * INTO v_request FROM public.merchant_payout_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MERCHANT_PAYOUT_NOT_FOUND';
  END IF;

  SELECT mp.org_id, mp.settlement_ledger_account_id INTO v_org_id, v_settlement_account_id
  FROM public.merchant_profiles mp WHERE mp.id = v_request.merchant_id;

  IF v_settlement_account_id IS NULL THEN
    RAISE EXCEPTION 'MERCHANT_SETTLEMENT_ACCOUNT_NOT_PROVISIONED';
  END IF;

  SELECT balance INTO v_settlement_balance
  FROM public.ledger_accounts WHERE id = v_settlement_account_id
  FOR UPDATE;

  IF v_settlement_balance < v_request.amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
  SELECT v_org_id, 'MERCHANT-PAYOUT-CLEARING-' || v_request.currency, 'Merchant Payout Clearing — ' || v_request.currency, 'LIABILITY', v_request.currency,
         (SELECT country FROM public.organizations WHERE id = v_org_id), 0.00
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ledger_accounts WHERE currency = v_request.currency AND account_number = 'MERCHANT-PAYOUT-CLEARING-' || v_request.currency
  );
  SELECT id INTO v_clearing_account_id
  FROM public.ledger_accounts
  WHERE currency = v_request.currency AND account_number = 'MERCHANT-PAYOUT-CLEARING-' || v_request.currency
  FOR UPDATE;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_org_id, 'PAYOUT-' || gen_random_uuid()::text, 'Merchant payout executed — pending bank rail integration', v_request.amount, v_request.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_settlement_account_id, 'DEBIT', v_request.amount, v_request.currency, 'Payout executed: settlement balance debited'),
    (v_ledger_tx_id, v_clearing_account_id, 'CREDIT', v_request.amount, v_request.currency, 'Payout staged to outbound clearing pending provider confirmation');

  UPDATE public.ledger_accounts SET balance = balance - v_request.amount, updated_at = NOW() WHERE id = v_settlement_account_id;
  UPDATE public.ledger_accounts SET balance = balance + v_request.amount, updated_at = NOW() WHERE id = v_clearing_account_id;

  UPDATE public.merchant_payout_requests
  SET status = 'PENDING_PROVIDER_INTEGRATION', ledger_transaction_id = v_ledger_tx_id
  WHERE id = p_request_id;
END;
$function$;

-- request_merchant_payout v2 (signature unchanged): below the threshold the
-- behaviour is exactly as before (journal posted on request). At/above the
-- threshold the request is created PENDING_APPROVAL and NO money moves until
-- approve_merchant_payout has collected the required distinct approvals.
CREATE OR REPLACE FUNCTION public.request_merchant_payout(p_merchant_id uuid, p_requested_by uuid, p_amount numeric, p_idempotency_key character varying)
 RETURNS merchant_payout_requests
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_existing public.merchant_payout_requests;
  v_merchant RECORD;
  v_settlement_balance NUMERIC(24,2);
  v_payout public.merchant_payout_requests;
  v_required INT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.merchant_payout_requests
    WHERE merchant_id = p_merchant_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  SELECT mp.currency, mp.settlement_bank, mp.settlement_account_number, mp.settlement_ledger_account_id, mp.org_id
  INTO v_merchant
  FROM public.merchant_profiles mp
  WHERE mp.id = p_merchant_id;

  IF NOT FOUND OR v_merchant.settlement_ledger_account_id IS NULL THEN
    RAISE EXCEPTION 'MERCHANT_SETTLEMENT_ACCOUNT_NOT_PROVISIONED';
  END IF;

  SELECT balance INTO v_settlement_balance
  FROM public.ledger_accounts
  WHERE id = v_merchant.settlement_ledger_account_id
  FOR UPDATE;

  IF v_settlement_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  v_required := public.get_required_approvals('MERCHANT_PAYOUT_DUAL_CONTROL', v_merchant.org_id, v_merchant.currency, p_amount);

  INSERT INTO public.merchant_payout_requests (
    merchant_id, requested_by, amount, currency, destination_bank, destination_account,
    status, ledger_transaction_id, idempotency_key
  ) VALUES (
    p_merchant_id, p_requested_by, p_amount, v_merchant.currency, v_merchant.settlement_bank, v_merchant.settlement_account_number,
    CASE WHEN v_required > 1 THEN 'PENDING_APPROVAL' ELSE 'PENDING_PROVIDER_INTEGRATION' END,
    NULL, p_idempotency_key
  )
  RETURNING * INTO v_payout;

  IF v_required > 1 THEN
    -- High-value request: nothing moves until the required number of
    -- distinct internal approvers (none of them the requester) sign off.
    INSERT INTO public.control_approval_events (approval_type, reference_id, org_id, actor_id, actor_role, decision, notes)
    VALUES ('MERCHANT_PAYOUT', v_payout.id, v_merchant.org_id, p_requested_by::text, 'MERCHANT_STAFF', 'SUBMIT',
            'High-value payout requested — awaiting ' || v_required || ' distinct internal approvals');
    RETURN v_payout;
  END IF;

  PERFORM public._execute_merchant_payout(v_payout.id);
  SELECT * INTO v_payout FROM public.merchant_payout_requests WHERE id = v_payout.id;
  RETURN v_payout;
END;
$function$;

-- approve_merchant_payout — the checker step for high-value merchant
-- payouts. Enforces: distinct approvers, no self-approval (the requester can
-- never approve), and posts the journal only when the policy is satisfied.
CREATE OR REPLACE FUNCTION public.approve_merchant_payout(p_request_id uuid, p_approver_id uuid, p_decision character varying, p_notes text)
 RETURNS merchant_payout_requests
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_request public.merchant_payout_requests;
  v_org_id UUID;
  v_required INT;
  v_approvers INT;
BEGIN
  IF p_decision NOT IN ('APPROVE', 'REJECT') THEN
    RAISE EXCEPTION 'INVALID_DECISION';
  END IF;

  SELECT * INTO v_request FROM public.merchant_payout_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MERCHANT_PAYOUT_NOT_FOUND';
  END IF;
  IF v_request.status <> 'PENDING_APPROVAL' THEN
    RAISE EXCEPTION 'MERCHANT_PAYOUT_NOT_PENDING_STATUS_%', v_request.status;
  END IF;

  SELECT mp.org_id INTO v_org_id FROM public.merchant_profiles mp WHERE mp.id = v_request.merchant_id;

  -- No self-approval anywhere: the requester is never an approver.
  IF v_request.requested_by IS NOT NULL AND p_approver_id = v_request.requested_by THEN
    RAISE EXCEPTION 'SEGREGATION_OF_DUTIES_VIOLATION';
  END IF;

  IF p_decision = 'REJECT' THEN
    PERFORM public.record_control_approval('MERCHANT_PAYOUT', p_request_id, p_approver_id::text, 'REJECT', p_notes, 'BACK_OFFICE', v_org_id);
    UPDATE public.merchant_payout_requests
    SET status = 'CANCELLED', completed_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_request;
    RETURN v_request;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.control_approval_events
    WHERE approval_type = 'MERCHANT_PAYOUT' AND reference_id = p_request_id
      AND actor_id = p_approver_id::text AND decision = 'APPROVE'
  ) THEN
    RAISE EXCEPTION 'SECOND_APPROVER_MUST_BE_A_DIFFERENT_USER';
  END IF;

  v_required := public.get_required_approvals('MERCHANT_PAYOUT_DUAL_CONTROL', v_org_id, v_request.currency, v_request.amount);
  v_approvers := public.record_control_approval('MERCHANT_PAYOUT', p_request_id, p_approver_id::text, 'APPROVE', p_notes, 'BACK_OFFICE', v_org_id);

  IF v_approvers < v_required THEN
    SELECT * INTO v_request FROM public.merchant_payout_requests WHERE id = p_request_id;
    RETURN v_request; -- more distinct approvals needed; still no money moved
  END IF;

  PERFORM public._execute_merchant_payout(p_request_id);
  SELECT * INTO v_request FROM public.merchant_payout_requests WHERE id = p_request_id;
  RETURN v_request;
END;
$function$;

-- =============================================================================
-- S5. Commission/fee rate governance (§43: "modify fee + approve fee")
--     Rate changes must be attributed to an actor and are snapshotted
--     before/after. The rate card is not app-editable, so SQL changes are
--     the surface being governed here.
-- =============================================================================

ALTER TABLE public.agent_commission_rates ADD COLUMN IF NOT EXISTS updated_by UUID;

CREATE TABLE IF NOT EXISTS public.agent_commission_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_id UUID NOT NULL,
  old_values JSONB NOT NULL,
  new_values JSONB NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_rate_history_rate
  ON public.agent_commission_rate_history (rate_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_commission_rate_governance() RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_changed BOOLEAN;
BEGIN
  v_changed :=
       OLD.transaction_type   IS DISTINCT FROM NEW.transaction_type
    OR OLD.currency           IS DISTINCT FROM NEW.currency
    OR OLD.min_amount         IS DISTINCT FROM NEW.min_amount
    OR OLD.max_amount         IS DISTINCT FROM NEW.max_amount
    OR OLD.customer_fee_flat  IS DISTINCT FROM NEW.customer_fee_flat
    OR OLD.customer_fee_bps   IS DISTINCT FROM NEW.customer_fee_bps
    OR OLD.agent_commission_flat IS DISTINCT FROM NEW.agent_commission_flat
    OR OLD.agent_commission_bps IS DISTINCT FROM NEW.agent_commission_bps
    OR OLD.is_active          IS DISTINCT FROM NEW.is_active;

  IF v_changed THEN
    IF NEW.updated_by IS NULL THEN
      RAISE EXCEPTION 'COMMISSION_RATE_UPDATE_REQUIRES_ACTOR: set updated_by when changing fee/commission rates';
    END IF;
    INSERT INTO public.agent_commission_rate_history (rate_id, old_values, new_values, changed_by)
    VALUES (
      OLD.id,
      to_jsonb(OLD) - 'updated_by',
      to_jsonb(NEW) - 'updated_by',
      NEW.updated_by
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_commission_rate_governance ON public.agent_commission_rates;
CREATE TRIGGER trg_commission_rate_governance
  BEFORE UPDATE ON public.agent_commission_rates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_commission_rate_governance();
