-- =============================================================================
-- Dispute financial decisions under maker-checker (portal roadmap PS-2, P0)
--
-- Phase 1.1 of the portal review roadmap: REFUND_APPROVED / REVERSAL_APPROVED
-- / PARTIAL_REFUND were the last single-officer money movements — one
-- authorized officer could post a wallet-crediting journal alone. This
-- migration puts them behind the same unconditional two-person rule as every
-- other money movement (B8 / H.16 pattern):
--
--   submit_dispute_decision  the MAKER step: an eligible officer (decision
--                            owner role / SUPPORT_MANAGER / SUPER_ADMIN — the
--                            same eligibility the single-officer path had)
--                            submits the financial decision for a PENDING
--                            dispute. Nothing posts.
--   decide_dispute_decision  the CHECKER step: a DIFFERENT officer with
--                            check authority (specialist roles + SUPPORT_
--                            SUPERVISOR) approves or rejects. APPROVE executes
--                            public.post_dispute_resolution INSIDE the
--                            approval transaction — a posting failure rolls
--                            the whole approval back and the request stays
--                            PENDING. The posting officer on the journal is
--                            the CHECKER (the person who authorized it),
--                            mirroring the M12 reversal attribution.
--
-- Guards: PENDING-only, no self-approval (officer id AND login email),
-- already-decided refused, one financial decision per transaction (a second
-- dispute on the same transaction is refused while one decision exists or is
-- pending), PARTIAL_REFUND amount validated and capped, reason >= 20 chars,
-- decision-owner eligibility enforced at submission.
--
-- Non-financial decisions (REJECTED / UNDER_INVESTIGATION) move no money and
-- remain single-officer — an explicit policy choice, documented in the
-- roadmap, not an omission.
--
-- Also: the daily close's orphan detector now links dispute-resolution
-- journals structurally (support_disputes.recovery_case_reference IS the
-- ledger_transactions.transaction_reference of the DRC-* posting) — before
-- this, the first dispute refund would have counted as an orphan.
-- =============================================================================

BEGIN;

-- =============================================================================
-- S1. Extend the action-type domain
-- =============================================================================

ALTER TABLE public.maker_checker_requests
  DROP CONSTRAINT maker_checker_requests_action_type_check;

ALTER TABLE public.maker_checker_requests
  ADD CONSTRAINT maker_checker_requests_action_type_check
  CHECK (action_type::text = ANY (ARRAY[
    'MANUAL_JOURNAL_POST'::character varying,
    'PERIOD_CLOSE'::character varying,
    'PERIOD_LOCK'::character varying,
    'PERIOD_REOPEN'::character varying,
    'SUSPENSE_WRITEOFF'::character varying,
    'SETTLEMENT_OVERRIDE'::character varying,
    'AGENCY_SETTLEMENT_RUN'::character varying,
    'MERCHANT_SETTLEMENT_RUN'::character varying,
    'AGENCY_TRANSACTION_REVERSAL'::character varying,
    'DISPUTE_FINANCIAL_DECISION'::character varying
  ]::text[]));

-- =============================================================================
-- S2. The MAKER step — submit a financial dispute decision
-- =============================================================================

CREATE OR REPLACE FUNCTION public.submit_dispute_decision(
  p_dispute_id uuid,
  p_decision_type character varying,
  p_reason text,
  p_partial_amount numeric DEFAULT NULL,
  p_maker_officer_id uuid DEFAULT NULL,
  p_maker_email character varying(128) DEFAULT NULL,
  p_maker_notes text DEFAULT NULL
)
RETURNS public.maker_checker_requests
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_officer RECORD;
  v_dispute RECORD;
  v_txn RECORD;
  v_request public.maker_checker_requests;
  v_partial numeric;
BEGIN
  IF p_decision_type NOT IN ('REFUND_APPROVED', 'REVERSAL_APPROVED', 'PARTIAL_REFUND') THEN
    RAISE EXCEPTION 'DISPUTE_DECISION_TYPE_NOT_FINANCIAL: only REFUND_APPROVED, REVERSAL_APPROVED and PARTIAL_REFUND require the checked path';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 20 THEN
    RAISE EXCEPTION 'DISPUTE_DECISION_REASON_REQUIRED: a meaningful reason (at least 20 characters) is required';
  END IF;

  -- The maker must be a real, ACTIVE support officer.
  SELECT id, email, full_name, role, status INTO v_officer
  FROM public.support_officers
  WHERE id = p_maker_officer_id
     OR lower(email) = lower(NULLIF(trim(p_maker_email), ''))
  ORDER BY (CASE WHEN id = p_maker_officer_id THEN 0 ELSE 1 END), status
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DISPUTE_DECISION_MAKER_NOT_FOUND: no support officer matches the maker identity';
  END IF;
  IF v_officer.status NOT IN ('ONLINE', 'BUSY', 'AWAY') THEN
    RAISE EXCEPTION 'DISPUTE_DECISION_MAKER_INACTIVE: the submitting officer is not active';
  END IF;

  -- The dispute must exist and be undecided.
  SELECT * INTO v_dispute
  FROM public.support_disputes
  WHERE id = p_dispute_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DISPUTE_NOT_FOUND';
  END IF;
  IF v_dispute.decision_type IS NOT NULL THEN
    RAISE EXCEPTION 'DISPUTE_ALREADY_DECIDED: %', v_dispute.decision_type;
  END IF;

  -- Maker eligibility: the SAME rule the single-officer path enforced —
  -- the decision owner's role, SUPPORT_MANAGER or SUPER_ADMIN. This does
  -- not loosen the existing authorization; it only adds the second person.
  IF v_officer.role <> v_dispute.decision_owner
     AND v_officer.role NOT IN ('SUPPORT_MANAGER', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'DISPUTE_DECISION_MAKER_NOT_ELIGIBLE: this dispute must be decided by % (or a Support Manager)', v_dispute.decision_owner;
  END IF;

  -- One financial decision per transaction: refuse while another dispute on
  -- the same transaction is already decided or has a pending request.
  IF EXISTS (
    SELECT 1 FROM public.support_disputes d
    WHERE d.transaction_reference = v_dispute.transaction_reference
      AND d.id <> v_dispute.id
      AND d.decision_type IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'DISPUTE_TRANSACTION_ALREADY_RESOLVED: another dispute on transaction % already has a financial decision', v_dispute.transaction_reference;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.maker_checker_requests m
    WHERE m.action_type = 'DISPUTE_FINANCIAL_DECISION'
      AND m.status = 'PENDING'
      AND (m.payload->>'dispute_id')::uuid = v_dispute.id
  ) THEN
    RAISE EXCEPTION 'DISPUTE_REQUEST_ALREADY_PENDING: a financial decision for this dispute is already awaiting a checker';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.maker_checker_requests m
    JOIN public.support_disputes d
      ON (m.payload->>'dispute_id')::uuid = d.id
    WHERE m.action_type = 'DISPUTE_FINANCIAL_DECISION'
      AND m.status = 'PENDING'
      AND d.transaction_reference = v_dispute.transaction_reference
  ) THEN
    RAISE EXCEPTION 'DISPUTE_REQUEST_ALREADY_PENDING: a financial decision for transaction % is already awaiting a checker', v_dispute.transaction_reference;
  END IF;

  -- Validate the posting target the same way the RPC will.
  SELECT * INTO v_txn
  FROM public.customer_transactions
  WHERE reference = v_dispute.transaction_reference
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DISPUTE_TRANSACTION_NOT_FOUND: no customer transaction % exists to refund', v_dispute.transaction_reference;
  END IF;
  IF v_txn.status = 'REVERSED' THEN
    RAISE EXCEPTION 'DISPUTE_TRANSACTION_ALREADY_REVERSED';
  END IF;

  IF p_decision_type = 'PARTIAL_REFUND' THEN
    v_partial := round(COALESCE(p_partial_amount, 0), 2);
    IF v_partial <= 0 THEN
      RAISE EXCEPTION 'DISPUTE_PARTIAL_AMOUNT_REQUIRED: PARTIAL_REFUND requires a positive amount';
    END IF;
    IF v_partial > (v_txn.amount + v_txn.fee) THEN
      RAISE EXCEPTION 'DISPUTE_PARTIAL_AMOUNT_EXCEEDS_TOTAL: % exceeds the transaction total %', v_partial, (v_txn.amount + v_txn.fee);
    END IF;
  ELSE
    v_partial := NULL;
  END IF;

  INSERT INTO public.maker_checker_requests (
    action_type, maker_id, maker_email, maker_role, maker_notes, payload
  ) VALUES (
    'DISPUTE_FINANCIAL_DECISION',
    v_officer.id,
    v_officer.email,
    v_officer.role,
    p_maker_notes,
    jsonb_build_object(
      'dispute_id', v_dispute.id,
      'dispute_number', v_dispute.dispute_number,
      'decision_type', p_decision_type,
      'reason', trim(p_reason),
      'partial_amount', v_partial,
      'transaction_reference', v_dispute.transaction_reference,
      'customer_id', v_dispute.customer_id,
      'currency', v_dispute.currency
    )
  )
  RETURNING * INTO v_request;

  INSERT INTO public.audit_events (actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (
    v_officer.id, v_officer.email, v_officer.role, 'DISPUTE_DECISION_SUBMITTED', 'maker_checker_requests', v_request.id::text,
    jsonb_build_object('dispute_id', v_dispute.id, 'dispute_number', v_dispute.dispute_number,
                       'decision_type', p_decision_type, 'partial_amount', v_partial,
                       'transaction_reference', v_dispute.transaction_reference, 'reason', trim(p_reason)),
    'db-function', 'MCM-' || v_request.id::text, 'MCM-' || v_request.id::text
  );

  RETURN v_request;
END;
$function$;

-- =============================================================================
-- S3. The CHECKER step — approve-and-execute / reject
-- =============================================================================

CREATE OR REPLACE FUNCTION public.decide_dispute_decision(
  p_request_id uuid,
  p_checker_officer_id uuid,
  p_checker_email character varying(128),
  p_decision character varying(16),
  p_checker_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_request public.maker_checker_requests;
  v_officer RECORD;
  v_dispute RECORD;
  v_payload jsonb;
  v_result jsonb;
BEGIN
  IF p_decision NOT IN ('APPROVE', 'REJECT') THEN
    RAISE EXCEPTION 'MAKER_CHECKER_INVALID_DECISION';
  END IF;
  IF p_checker_notes IS NULL OR length(trim(p_checker_notes)) < 20 THEN
    RAISE EXCEPTION 'DISPUTE_DECISION_CHECKER_NOTES_REQUIRED: a meaningful note (at least 20 characters) is required';
  END IF;

  -- The checker must be a real, ACTIVE support officer.
  SELECT id, email, full_name, role, status INTO v_officer
  FROM public.support_officers
  WHERE id = p_checker_officer_id
     OR lower(email) = lower(NULLIF(trim(p_checker_email), ''))
  ORDER BY (CASE WHEN id = p_checker_officer_id THEN 0 ELSE 1 END), status
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DISPUTE_DECISION_CHECKER_NOT_FOUND: no support officer matches the checker identity';
  END IF;
  IF v_officer.status NOT IN ('ONLINE', 'BUSY', 'AWAY') THEN
    RAISE EXCEPTION 'DISPUTE_DECISION_CHECKER_INACTIVE: the deciding officer is not active';
  END IF;

  SELECT * INTO v_request
  FROM public.maker_checker_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MAKER_CHECKER_REQUEST_NOT_FOUND';
  END IF;
  IF v_request.action_type <> 'DISPUTE_FINANCIAL_DECISION' THEN
    RAISE EXCEPTION 'MAKER_CHECKER_WRONG_ACTION_TYPE';
  END IF;
  IF v_request.status <> 'PENDING' THEN
    RAISE EXCEPTION 'MAKER_CHECKER_REQUEST_ALREADY_DECIDED';
  END IF;

  -- Unconditional two-person rule: officer id AND login email (mirrors B8).
  IF v_request.maker_id = v_officer.id
     OR lower(v_request.maker_email) = lower(v_officer.email) THEN
    RAISE EXCEPTION 'MAKER_CHECKER_SELF_APPROVAL_FORBIDDEN';
  END IF;

  v_payload := v_request.payload;
  SELECT * INTO v_dispute FROM public.support_disputes WHERE id = (v_payload->>'dispute_id')::uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DISPUTE_NOT_FOUND';
  END IF;

  -- Checker eligibility: a different person who could legitimately decide —
  -- the dispute's decision-owner role, SUPPORT_MANAGER, SUPER_ADMIN, or the
  -- SUPPORT_SUPERVISOR (the natural second pair of eyes; a supervisor may
  -- check but never initiate).
  IF v_officer.role <> v_dispute.decision_owner
     AND v_officer.role NOT IN ('SUPPORT_MANAGER', 'SUPER_ADMIN', 'SUPPORT_SUPERVISOR') THEN
    RAISE EXCEPTION 'DISPUTE_DECISION_CHECKER_NOT_ELIGIBLE: this decision must be checked by % , a Support Manager, or a Support Supervisor', v_dispute.decision_owner;
  END IF;

  IF p_decision = 'REJECT' THEN
    UPDATE public.maker_checker_requests
    SET status = 'REJECTED', checker_id = v_officer.id, checker_email = v_officer.email,
        checker_notes = trim(p_checker_notes), rejected_at = now()
    WHERE id = v_request.id;

    INSERT INTO public.control_approval_events (approval_type, reference_id, actor_id, decision, notes)
    VALUES ('DISPUTE_FINANCIAL_DECISION', v_request.id, v_officer.email, 'REJECT', trim(p_checker_notes));

    INSERT INTO public.audit_events (actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
    VALUES (v_officer.id, v_officer.email, v_officer.role, 'DISPUTE_DECISION_REJECTED', 'maker_checker_requests', v_request.id::text,
            jsonb_build_object('dispute_number', v_dispute.dispute_number, 'notes', trim(p_checker_notes)),
            'db-function', 'MCM-' || v_request.id::text, 'MCM-' || v_request.id::text);

    RETURN jsonb_build_object('status', 'REJECTED', 'request_id', v_request.id,
                              'action_type', v_request.action_type, 'payload', v_payload,
                              'execution_result', NULL);
  END IF;

  -- APPROVE: execute the posting INSIDE this transaction. Any failure
  -- (already decided meanwhile, transaction reversed, wallet missing, ...)
  -- rolls the whole approval back and the request stays PENDING.
  DECLARE
    v_posted RECORD;
  BEGIN
    SELECT * INTO v_posted FROM public.post_dispute_resolution(
      v_dispute.id,
      v_payload->>'decision_type',
      v_officer.id,
      v_payload->>'reason',
      CASE WHEN v_payload->>'decision_type' = 'PARTIAL_REFUND' THEN (v_payload->>'partial_amount')::numeric ELSE NULL END
    );

    v_result := jsonb_build_object(
      'dispute_id', v_dispute.id,
      'dispute_number', v_dispute.dispute_number,
      'transaction_reference', v_dispute.transaction_reference,
      'decision_type', v_payload->>'decision_type',
      'recovery_reference', v_posted.recovery_reference,
      'posted_amount', v_posted.posted_amount,
      'posted_currency', v_posted.posted_currency,
      'new_wallet_balance', v_posted.new_wallet_balance,
      'transaction_status', v_posted.transaction_status
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'DISPUTE_DECISION_EXECUTION_FAILED: %', SQLERRM;
  END;

  UPDATE public.maker_checker_requests
  SET status = 'EXECUTED', checker_id = v_officer.id, checker_email = v_officer.email,
      checker_notes = trim(p_checker_notes), approved_at = now(), executed_at = now(),
      execution_result = v_result
  WHERE id = v_request.id;

  INSERT INTO public.control_approval_events (approval_type, reference_id, actor_id, decision, notes)
  VALUES ('DISPUTE_FINANCIAL_DECISION', v_request.id, v_officer.email, 'APPROVE', trim(p_checker_notes));

  INSERT INTO public.audit_events (actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (v_officer.id, v_officer.email, v_officer.role, 'DISPUTE_DECISION_EXECUTED', 'maker_checker_requests', v_request.id::text,
          jsonb_build_object('dispute_number', v_dispute.dispute_number, 'execution_result', v_result,
                             'notes', trim(p_checker_notes)),
          'db-function', 'MCM-' || v_request.id::text, 'MCM-' || v_request.id::text);

  RETURN jsonb_build_object('status', 'EXECUTED', 'request_id', v_request.id,
                            'action_type', v_request.action_type, 'payload', v_payload,
                            'execution_result', v_result);
END;
$function$;

-- =============================================================================
-- S4. Close v7 re-apply: dispute-resolution journals are linked, not orphans.
--     support_disputes.recovery_case_reference IS the DRC-* journal's
--     transaction_reference — the structural link the orphan check lacked.
--     Identical to 000059/000060's close v7 in every other respect (body
--     spliced from 000060 S8, one line added).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.run_daily_financial_close(p_close_date date DEFAULT CURRENT_DATE, p_closed_by character varying DEFAULT 'system')
RETURNS public.daily_financial_closes
LANGUAGE plpgsql
AS $function$
DECLARE
  v_row public.daily_financial_closes;
  v_journals INT;
  v_debit_vol BIGINT;
  v_credit_vol BIGINT;
  v_per_currency JSONB;
  v_drift JSONB;
  v_wallet_desync JSONB;
  v_unbacked JSONB;
  v_negative JSONB;
  v_clearing_aging JSONB;
  v_commission_aging JSONB;
  v_deferred_fees JSONB;
  v_orphans INT;
  v_unbalanced_today INT := 0;
  v_exceptions INT := 0;
  v_equation BOOLEAN;
  v_commission_aging_count INT;
  v_commission_aging_amount NUMERIC(24,2);
  v_variance_count INT;
  v_variance_amount NUMERIC(24,2);
  v_variance_aging JSONB;
  v_suspense_balances JSONB;
  v_suspense_nonzero INT;
  v_false_matches INT;
  v_recon_pending INT;
  v_recon_mismatch INT;
  v_fx_positions JSONB;
  v_fx_drift INT := 0;
  v_fx_stale INT;
  v_fx_gain NUMERIC(24,2);
  v_fx_loss NUMERIC(24,2);
  v_fx_reserve NUMERIC(24,2);
  v_fx_marked NUMERIC(24,2);
  v_acquiring_receivable JSONB;
  v_acquiring_aging INT;
  v_mc_pending INT;
  v_mc_pending_aging INT;
BEGIN
  SELECT count(DISTINCT t.id),
         COALESCE(SUM(CASE WHEN e.entry_type = 'DEBIT'  THEN e.amount ELSE 0 END), 0)::bigint,
         COALESCE(SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE 0 END), 0)::bigint
  INTO v_journals, v_debit_vol, v_credit_vol
  FROM public.ledger_transactions t
  JOIN public.ledger_entries e ON e.transaction_id = t.id
  WHERE t.created_at::date = p_close_date;

  SELECT count(*) INTO v_unbalanced_today
  FROM (
    SELECT t.id
    FROM public.ledger_transactions t
    JOIN public.ledger_entries e ON e.transaction_id = t.id
    WHERE t.created_at::date = p_close_date
    GROUP BY t.id
    HAVING SUM(CASE WHEN e.entry_type = 'DEBIT'  THEN e.amount ELSE 0 END)
         <> SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE 0 END)
  ) u;

  SELECT jsonb_object_agg(s.currency, jsonb_build_object('journals', s.j, 'debits', s.d, 'credits', s.c, 'balanced', s.d = s.c))
  INTO v_per_currency
  FROM (
    SELECT t.currency,
           count(DISTINCT t.id) AS j,
           COALESCE(SUM(CASE WHEN e.entry_type = 'DEBIT'  THEN e.amount ELSE 0 END), 0) AS d,
           COALESCE(SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE 0 END), 0) AS c
    FROM public.ledger_transactions t
    JOIN public.ledger_entries e ON e.transaction_id = t.id
    WHERE t.created_at::date = p_close_date
    GROUP BY t.currency
  ) s;

  SELECT jsonb_agg(jsonb_build_object('account', x.account_number, 'stored', x.stored, 'derived', x.derived))
  INTO v_drift
  FROM (
    SELECT la.account_number, la.balance AS stored,
           COALESCE(SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END), 0) AS derived
    FROM public.ledger_accounts la
    LEFT JOIN public.ledger_entries e ON e.account_id = la.id
    GROUP BY la.id, la.account_number, la.balance
    HAVING la.balance <> COALESCE(SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END), 0)
  ) x;

  SELECT jsonb_agg(jsonb_build_object('wallet_id', w.id, 'wallet_balance', w.balance, 'ledger_balance', la.balance))
  INTO v_wallet_desync
  FROM public.wallets w
  JOIN public.ledger_accounts la ON la.id = w.ledger_account_id
  WHERE w.balance <> la.balance;

  SELECT jsonb_agg(jsonb_build_object('wallet_id', w.id, 'balance', w.balance))
  INTO v_unbacked
  FROM public.wallets w
  WHERE w.ledger_account_id IS NULL AND w.balance <> 0;

  SELECT jsonb_agg(jsonb_build_object('account', la.account_number, 'balance', la.balance))
  INTO v_negative
  FROM public.ledger_accounts la
  WHERE la.balance < 0
    AND (la.account_number LIKE '%ESCROW%' OR la.account_number LIKE '%CLEARING%' OR la.account_number LIKE '%FX-BOOK%');

  SELECT jsonb_agg(jsonb_build_object('account', x.account_number, 'balance', x.balance, 'days_idle', x.age_days))
  INTO v_clearing_aging
  FROM (
    SELECT la.account_number, la.balance, (CURRENT_DATE - max(e.created_at)::date) AS age_days
    FROM public.ledger_accounts la
    JOIN public.ledger_entries e ON e.account_id = la.id
    WHERE (la.account_number LIKE '%CLEARING%' OR la.account_number LIKE '%ESCROW%') AND la.balance > 0
    GROUP BY la.id, la.account_number, la.balance
    HAVING max(e.created_at) < NOW() - INTERVAL '3 days'
  ) x;

  SELECT count(*), COALESCE(SUM(amount), 0) INTO v_commission_aging_count, v_commission_aging_amount
  FROM public.agent_commissions
  WHERE status IN ('EARNED', 'PENDING_SETTLEMENT')
    AND earned_at < NOW() - INTERVAL '7 days';
  v_commission_aging := jsonb_build_object('count', v_commission_aging_count, 'amount', v_commission_aging_amount);

  SELECT jsonb_object_agg(la.currency, la.balance)
  INTO v_deferred_fees
  FROM public.ledger_accounts la
  WHERE la.account_number LIKE 'TRANSFER-FEE-DEFERRED-%' AND la.balance <> 0;

  SELECT count(*) INTO v_orphans
  FROM public.ledger_transactions t
  WHERE t.transaction_reference NOT LIKE 'ADJ-%'
    AND t.transaction_reference NOT LIKE 'FUND-%'
    AND t.transaction_reference NOT LIKE 'KP-%-FUND-%'
    AND t.transaction_reference NOT LIKE 'SEED-%'
    AND t.transaction_reference NOT LIKE 'DEMO-FUND-%'
    AND t.transaction_reference NOT LIKE 'CASHVAR-RES-%'
        AND t.transaction_reference NOT LIKE 'FXREVAL-%'
    AND t.transaction_reference <> 'KP-2026-CTX-2AF878C5'
    AND NOT EXISTS (SELECT 1 FROM public.customer_transactions c WHERE c.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.agency_transactions a WHERE a.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.agency_transactions ar WHERE ar.reversal_ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.merchant_payment_transactions m WHERE m.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.agent_float_topup_requests f WHERE f.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.settlement_batch_lines s WHERE s.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.merchant_settlement_batches b WHERE b.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM adashi.payouts p WHERE p.ledger_journal_id = t.id::text)
    AND NOT EXISTS (SELECT 1 FROM adashi.contribution_obligations o WHERE o.ledger_journal_id = t.id::text)
    AND NOT EXISTS (SELECT 1 FROM public.agent_cash_reconciliations r WHERE r.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.customer_fx_swaps fs
                    WHERE fs.ledger_transaction_id = t.id
                       OR fs.reversal_ledger_transaction_id = t.id
                       OR t.transaction_reference = fs.reference || '-REV-NGN'
                       OR t.transaction_reference = fs.reference || '-REV-XOF')
    AND NOT EXISTS (SELECT 1 FROM public.merchant_payout_requests pr WHERE pr.ledger_transaction_id = t.id OR pr.reversal_ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.fx_revaluations fv WHERE fv.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.support_disputes sd WHERE sd.recovery_case_reference = t.transaction_reference);

  SELECT count(*), COALESCE(SUM(ABS(difference)), 0) INTO v_variance_count, v_variance_amount
  FROM public.agent_cash_reconciliations
  WHERE status IN ('VARIANCE_JOURNALED', 'OVERAGE_PENDING_REVIEW');
  SELECT jsonb_agg(jsonb_build_object('reconciliation_id', x.id, 'agent_id', x.agent_id, 'status', x.status,
                                      'difference', x.difference, 'currency', x.currency, 'age_days', x.age_days))
  INTO v_variance_aging
  FROM (
    SELECT r.id, r.agent_id, r.status, r.difference, r.currency,
           (CURRENT_DATE - r.reconciliation_date) AS age_days
    FROM public.agent_cash_reconciliations r
    WHERE r.status IN ('VARIANCE_JOURNALED', 'OVERAGE_PENDING_REVIEW')
      AND r.reconciliation_date < CURRENT_DATE - INTERVAL '3 days'
  ) x;

  SELECT jsonb_object_agg(la.currency, la.balance)
  INTO v_suspense_balances
  FROM public.ledger_accounts la
  WHERE la.account_number LIKE 'SUSPENSE-%' AND la.balance <> 0;
  SELECT count(*) INTO v_suspense_nonzero
  FROM public.ledger_accounts la
  WHERE la.account_number LIKE 'SUSPENSE-%' AND la.balance <> 0;

  SELECT count(*) INTO v_false_matches
  FROM public.aggregator_reconciliations
  WHERE status = 'MATCHED'
    AND COALESCE(internal_ledger_total, 0) = 0
    AND COALESCE(provider_gateway_total, 0) = 0
    AND COALESCE(bank_settled_total, 0) = 0
    AND COALESCE(discrepancy_count, 0) = 0;

  -- Aggregator recon exceptions: aged pending (external data never arrived)
  -- and open mismatches (breaks under investigation).
  SELECT count(*) INTO v_recon_pending
  FROM public.aggregator_reconciliations
  WHERE status = 'PENDING_REVIEW'
    AND reconciliation_date < CURRENT_DATE - INTERVAL '3 days';
  SELECT count(*) INTO v_recon_mismatch
  FROM public.aggregator_reconciliations
  WHERE status = 'MISMATCH';

  -- FX revaluation state: position snapshot, integrity, staleness.
  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.is_base, p.currency), '[]'::jsonb)
  INTO v_fx_positions
  FROM public.generate_fx_position_report() p;

  SELECT
    COALESCE((SELECT balance FROM public.ledger_accounts WHERE account_number = 'FX-UNREALIZED-GAIN-NGN'), 0),
    COALESCE((SELECT balance FROM public.ledger_accounts WHERE account_number = 'FX-UNREALIZED-LOSS-NGN'), 0),
    COALESCE((SELECT balance FROM public.ledger_accounts WHERE account_number = 'FX-REVAL-RESERVE-NGN'), 0)
  INTO v_fx_gain, v_fx_loss, v_fx_reserve;

  SELECT COALESCE(SUM(x.unrealized_gain_loss), 0) INTO v_fx_marked
  FROM public.fx_revaluations x WHERE x.status = 'POSTED';

  IF (v_fx_gain + v_fx_loss + v_fx_reserve) <> 0 THEN
    v_fx_drift := v_fx_drift + 1; -- every mark journal is +delta/-delta: the trio must net to zero
  END IF;
  IF (v_fx_gain + v_fx_loss) <> v_fx_marked THEN
    v_fx_drift := v_fx_drift + 1; -- ledger P&L must equal the sum of posted marks
  END IF;

  SELECT count(*) INTO v_fx_stale
  FROM public.generate_fx_position_report() p
  WHERE NOT p.is_base AND p.position_units <> 0 AND p.stale_mark;

  -- Merchant acquiring receivable (F11): money the rails owe us, awaiting
  -- external bank confirmation (B4). Nonzero and unmoved for >3 days means
  -- the rail stalled or statements never arrived — a close exception.
  SELECT jsonb_object_agg(la.currency, jsonb_build_object('balance', la.balance, 'as_sign', CASE WHEN la.balance < 0 THEN 'rail_owes_us' ELSE 'rail_net_zero_or_credit' END))
  INTO v_acquiring_receivable
  FROM public.ledger_accounts la
  WHERE la.account_number LIKE 'MERCHANT-ACQUIRING-RECEIVABLE-%' AND la.balance <> 0;

  SELECT count(*) INTO v_acquiring_aging
  FROM (
    SELECT la.id
    FROM public.ledger_accounts la
    LEFT JOIN public.ledger_entries e ON e.account_id = la.id
    WHERE la.account_number LIKE 'MERCHANT-ACQUIRING-RECEIVABLE-%'
      AND la.balance <> 0
    GROUP BY la.id
    HAVING COALESCE(max(e.created_at), la.created_at) < NOW() - INTERVAL '3 days'
  ) a;

  -- Maker-checker queue: a settlement or reversal that was asked for and
  -- never decided. Pending is operational; pending for >3 days is a stuck
  -- money movement and counts as a close exception.
  SELECT count(*) INTO v_mc_pending
  FROM public.maker_checker_requests WHERE status = 'PENDING';
  SELECT count(*) INTO v_mc_pending_aging
  FROM public.maker_checker_requests
  WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '3 days';

  v_equation := (v_drift IS NULL)
            AND (v_wallet_desync IS NULL)
            AND (v_unbalanced_today = 0)
            AND NOT EXISTS (
              SELECT 1 FROM jsonb_each(v_per_currency) AS k(ccy, v)
              WHERE NOT COALESCE((v ->> 'balanced')::boolean, TRUE)
            );

  v_exceptions := COALESCE(jsonb_array_length(v_drift), 0)
               + COALESCE(jsonb_array_length(v_wallet_desync), 0)
               + COALESCE(jsonb_array_length(v_unbacked), 0)
               + COALESCE(jsonb_array_length(v_negative), 0)
               + COALESCE(jsonb_array_length(v_clearing_aging), 0)
               + v_unbalanced_today
               + v_orphans
               + v_variance_count
               + v_suspense_nonzero
               + v_false_matches
               + v_recon_pending
               + v_recon_mismatch
               + v_fx_drift
               + v_fx_stale
               + v_acquiring_aging
               + v_mc_pending_aging;

  DELETE FROM public.daily_financial_closes WHERE close_date = p_close_date;

  INSERT INTO public.daily_financial_closes (
    close_date, status, total_journals_posted, total_debit_volume, total_credit_volume,
    is_equation_balanced, unresolved_exceptions_count, closed_by, metrics
  ) VALUES (
    p_close_date,
    CASE WHEN v_exceptions = 0 THEN 'CLOSED_BALANCED' ELSE 'CLOSED_WITH_EXCEPTIONS' END,
    v_journals,
    v_debit_vol,
    v_credit_vol,
    v_equation,
    v_exceptions,
    p_closed_by,
    jsonb_build_object(
      'per_currency', v_per_currency,
      'balance_drift_accounts', COALESCE(v_drift, '[]'::jsonb),
      'wallet_ledger_desync', COALESCE(v_wallet_desync, '[]'::jsonb),
      'unbacked_wallets', COALESCE(v_unbacked, '[]'::jsonb),
      'negative_custodial_accounts', COALESCE(v_negative, '[]'::jsonb),
      'clearing_aging_over_3d', COALESCE(v_clearing_aging, '[]'::jsonb),
      'earned_commission_aging_over_7d', v_commission_aging,
      'deferred_transfer_fees', COALESCE(v_deferred_fees, '{}'::jsonb),
      'unbalanced_journals_today', v_unbalanced_today,
      'orphan_ledger_transactions', v_orphans,
      'unresolved_cash_variances', jsonb_build_object('count', v_variance_count, 'absolute_amount', v_variance_amount),
      'cash_variance_aging_over_3d', COALESCE(v_variance_aging, '[]'::jsonb),
      'suspense_balances', COALESCE(v_suspense_balances, '{}'::jsonb),
      'false_match_reconciliations', v_false_matches,
      'aggregator_recon_pending_over_3d', v_recon_pending,
      'aggregator_recon_mismatches', v_recon_mismatch,
      'fx_positions', v_fx_positions,
      'fx_reval_integrity_violations', v_fx_drift,
      'fx_stale_revaluation_marks', v_fx_stale,
      'merchant_acquiring_receivable', COALESCE(v_acquiring_receivable, '{}'::jsonb),
      'merchant_acquiring_aging_over_3d', v_acquiring_aging,
      'maker_checker_pending', v_mc_pending,
      'maker_checker_pending_over_3d', v_mc_pending_aging
    )
  )
  RETURNING * INTO v_row;

  INSERT INTO public.audit_events (org_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (
    NULL,
    '00000000-0000-4000-8000-000000000001',
    'system@koriepay.internal',
    'SYSTEM',
    'DAILY_FINANCIAL_CLOSE',
    'daily_financial_closes',
    v_row.id::text,
    jsonb_build_object('close_date', p_close_date, 'status', v_row.status,
                       'equation_balanced', v_equation, 'exceptions', v_exceptions, 'closed_by', p_closed_by),
    'db-function',
    'CLOSE-' || p_close_date::text,
    'CLOSE-' || p_close_date::text
  );

  RETURN v_row;
END;
$function$;


-- =============================================================================
-- S5. Permissions — service_role only (learned from PS-1: revoke the direct
--     anon/authenticated grants too, not just PUBLIC)
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.submit_dispute_decision(uuid, character varying, text, numeric, uuid, character varying, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decide_dispute_decision(uuid, uuid, character varying, character varying, text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_dispute_decision(uuid, character varying, text, numeric, uuid, character varying, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decide_dispute_decision(uuid, uuid, character varying, character varying, text) TO service_role;

COMMIT;
