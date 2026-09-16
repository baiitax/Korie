-- =============================================================================
-- 20260914000059_settlement_reversal_maker_checker.sql
--
-- Maker-checker on settlement runs and reversals (assessment B8 / RISK-13,
-- P0: "No maker-checker/dual approval on any money movement or settlement
-- run"; §21: "No maker-checker on any money movement, settlement run, or
-- adjustment"; §43: "SoD is degenerate — a single actor is the whole chain").
--
-- Uses the maker_checker_requests table the schema anticipated (0 rows until
-- now — the 90-day item "maker-checker framework generalized") and follows
-- the four-eyes discipline already established for float top-ups and merchant
-- payouts (migration 000051): no self-approval anywhere, distinct-approver
-- counting, full audit trail, and execution that happens only inside the
-- checker's approval transaction.
--
--   S1  maker_checker_requests: three new action types
--       (AGENCY_SETTLEMENT_RUN, MERCHANT_SETTLEMENT_RUN,
--       AGENCY_TRANSACTION_REVERSAL) + an execution_result column recording
--       what actually happened when the checker approved. The payload is
--       immutable after submission — the checker approves exactly what the
--       maker sent, verbatim.
--   S2  submit_money_movement_request(action, payload, maker...): validates
--       the payload per action type (org/merchant/transaction must exist,
--       reversal reason >= 20 chars), writes the PENDING request and an
--       audit event. This is the MAKER step; no money moves.
--   S3  decide_money_movement_request(request, checker, decision, notes):
--       the CHECKER step. Refuses self-approval (checker uuid must differ
--       from maker uuid). REJECT closes the request. APPROVE executes the
--       underlying, unchanged posting function INSIDE the approval
--       transaction — run_daily_settlement / run_merchant_settlement /
--       reverse_agency_transaction — and stores the execution result. If
--       the underlying function raises, the whole transaction rolls back:
--       the approval is not recorded and the request stays PENDING (safe
--       to retry). Every decision lands in control_approval_events and
--       audit_events.
--   S4  run_daily_financial_close v7 (signature + all v6 exception logic
--       preserved verbatim): pending money-movement requests are surfaced
--       and a request pending > 3 days counts as a close exception — a
--       settlement or reversal that was asked for and never decided.
--   S5  Perimeter: the two new functions follow the house posture (EXECUTE
--       revoked from PUBLIC, granted to service_role only).
--
-- The underlying posting functions keep their signatures and remain the
-- only executors; the sanctioned application paths now go through the
-- maker-checker gateway (ops / aggregator / merchant routes submit, ops and
-- admin approvals surfaces decide). Direct service-role RPC access remains
-- possible for the platform's server-side code by design — the control is
-- enforced on every sanctioned path and every decision is audited.
--
-- No existing function signature changes.
-- =============================================================================

-- =============================================================================
-- S1. Request table extension
-- =============================================================================

ALTER TABLE public.maker_checker_requests DROP CONSTRAINT maker_checker_requests_action_type_check;
ALTER TABLE public.maker_checker_requests
  ADD CONSTRAINT maker_checker_requests_action_type_check CHECK (
    action_type IN (
      'MANUAL_JOURNAL_POST', 'PERIOD_CLOSE', 'PERIOD_LOCK', 'PERIOD_REOPEN',
      'SUSPENSE_WRITEOFF', 'SETTLEMENT_OVERRIDE',
      'AGENCY_SETTLEMENT_RUN', 'MERCHANT_SETTLEMENT_RUN', 'AGENCY_TRANSACTION_REVERSAL'
    )
  );

COMMENT ON COLUMN public.maker_checker_requests.action_type IS 'Money-movement classes requiring four eyes. The SETTLEMENT/REVERSAL trio is executed by decide_money_movement_request (migration 000059); the original six types remain reserved for the future period-close / write-off framework.';

ALTER TABLE public.maker_checker_requests
  ADD COLUMN IF NOT EXISTS execution_result JSONB;

COMMENT ON COLUMN public.maker_checker_requests.execution_result IS 'What actually happened when the checker approved: batch ids/references for settlement runs, reversal outcome for reversals. Written once at execution; the payload column is never rewritten.';

-- =============================================================================
-- S2. The MAKER step
-- =============================================================================

CREATE OR REPLACE FUNCTION public.submit_money_movement_request(
  p_action_type character varying,
  p_payload jsonb,
  p_maker_id uuid,
  p_maker_email character varying,
  p_maker_role character varying DEFAULT NULL,
  p_maker_notes text DEFAULT NULL)
RETURNS public.maker_checker_requests
LANGUAGE plpgsql
AS $function$
DECLARE
  v_request public.maker_checker_requests;
  v_org UUID;
  v_merchant UUID;
  v_txn UUID;
  v_currency VARCHAR(3);
  v_settlement_date DATE;
  v_reason TEXT;
BEGIN
  IF p_maker_id IS NULL THEN
    RAISE EXCEPTION 'MAKER_IDENTITY_REQUIRED';
  END IF;
  IF p_maker_email IS NULL OR length(trim(p_maker_email)) = 0 THEN
    RAISE EXCEPTION 'MAKER_IDENTITY_REQUIRED';
  END IF;
  IF p_payload IS NULL THEN
    RAISE EXCEPTION 'MAKER_CHECKER_PAYLOAD_REQUIRED';
  END IF;

  IF p_action_type = 'AGENCY_SETTLEMENT_RUN' THEN
    IF p_payload->>'org_id' IS NULL OR p_payload->>'org_id' !~ '^[0-9a-fA-F-]{36}$'
       OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = (p_payload->>'org_id')::uuid) THEN
      RAISE EXCEPTION 'MAKER_CHECKER_INVALID_ORG';
    END IF;
    v_currency := upper(coalesce(p_payload->>'currency', ''));
    IF v_currency IS NULL OR length(v_currency) <> 3 THEN
      RAISE EXCEPTION 'MAKER_CHECKER_INVALID_CURRENCY';
    END IF;
    IF p_payload->>'settlement_date' IS NOT NULL THEN
      IF p_payload->>'settlement_date' !~ '^\d{4}-\d{2}-\d{2}$' THEN
        RAISE EXCEPTION 'MAKER_CHECKER_INVALID_DATE';
      END IF;
      v_settlement_date := (p_payload->>'settlement_date')::date;
    ELSE
      v_settlement_date := CURRENT_DATE;
    END IF;
    p_payload := jsonb_set(p_payload, '{settlement_date}', to_jsonb(to_char(v_settlement_date, 'YYYY-MM-DD')));

  ELSIF p_action_type = 'MERCHANT_SETTLEMENT_RUN' THEN
    IF p_payload->>'merchant_id' IS NULL OR p_payload->>'merchant_id' !~ '^[0-9a-fA-F-]{36}$'
       OR NOT EXISTS (SELECT 1 FROM public.merchant_profiles m WHERE m.id = (p_payload->>'merchant_id')::uuid) THEN
      RAISE EXCEPTION 'MAKER_CHECKER_INVALID_MERCHANT';
    END IF;
    v_currency := upper(coalesce(p_payload->>'currency', 'NGN'));
    IF length(v_currency) <> 3 THEN
      RAISE EXCEPTION 'MAKER_CHECKER_INVALID_CURRENCY';
    END IF;
    p_payload := jsonb_set(p_payload, '{currency}', to_jsonb(v_currency));

  ELSIF p_action_type = 'AGENCY_TRANSACTION_REVERSAL' THEN
    IF p_payload->>'transaction_id' IS NULL OR p_payload->>'transaction_id' !~ '^[0-9a-fA-F-]{36}$'
       OR NOT EXISTS (SELECT 1 FROM public.agency_transactions a WHERE a.id = (p_payload->>'transaction_id')::uuid) THEN
      RAISE EXCEPTION 'MAKER_CHECKER_INVALID_TRANSACTION';
    END IF;
    v_reason := coalesce(p_payload->>'reason', '');
    IF length(trim(v_reason)) < 20 THEN
      RAISE EXCEPTION 'REVERSAL_REASON_REQUIRED';
    END IF;

  ELSE
    RAISE EXCEPTION 'MAKER_CHECKER_UNKNOWN_ACTION_%', p_action_type;
  END IF;

  INSERT INTO public.maker_checker_requests (action_type, maker_id, maker_email, maker_role, maker_notes, payload, status)
  VALUES (p_action_type, p_maker_id, trim(p_maker_email), COALESCE(NULLIF(trim(p_maker_role), ''), 'OPERATIONS'), p_maker_notes, p_payload, 'PENDING')
  RETURNING * INTO v_request;

  INSERT INTO public.audit_events (org_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (
    NULL,
    p_maker_id,
    trim(p_maker_email),
    COALESCE(p_maker_role, 'OPERATIONS'),
    'MONEY_MOVEMENT_REQUEST_SUBMITTED',
    'maker_checker_requests',
    v_request.id::text,
    jsonb_build_object('action_type', p_action_type, 'payload', p_payload,
                       'maker_email', trim(p_maker_email), 'maker_notes', p_maker_notes),
    'db-function',
    'MCM-' || v_request.id::text,
    'MCM-' || v_request.id::text
  );

  RETURN v_request;
END;
$function$;

-- =============================================================================
-- S3. The CHECKER step (approve-and-execute / reject)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.decide_money_movement_request(
  p_request_id uuid,
  p_checker_id uuid,
  p_checker_email character varying,
  p_decision character varying,
  p_checker_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_request public.maker_checker_requests;
  v_result JSONB;
BEGIN
  IF p_checker_id IS NULL OR p_checker_email IS NULL OR length(trim(p_checker_email)) = 0 THEN
    RAISE EXCEPTION 'CHECKER_IDENTITY_REQUIRED';
  END IF;
  IF p_decision NOT IN ('APPROVE', 'REJECT') THEN
    RAISE EXCEPTION 'MAKER_CHECKER_INVALID_DECISION_%', p_decision;
  END IF;

  SELECT * INTO v_request FROM public.maker_checker_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MAKER_CHECKER_REQUEST_NOT_FOUND';
  END IF;
  IF v_request.status <> 'PENDING' THEN
    RAISE EXCEPTION 'MAKER_CHECKER_REQUEST_ALREADY_DECIDED';
  END IF;
  -- Distinct person, unconditionally: compare the database identity AND the
  -- login email. Email matters because makers on the merchant/aggregator
  -- portals are identified by their staff-table uuid, not their
  -- user_profiles uuid — the same human must not checker their own request
  -- through a second account.
  IF v_request.maker_id = p_checker_id
     OR lower(v_request.maker_email) = lower(NULLIF(p_checker_email, '')) THEN
    RAISE EXCEPTION 'MAKER_CHECKER_SELF_APPROVAL_FORBIDDEN';
  END IF;

  IF p_decision = 'REJECT' THEN
    UPDATE public.maker_checker_requests
    SET status = 'REJECTED', checker_id = p_checker_id, checker_email = trim(p_checker_email),
        checker_notes = p_checker_notes, rejected_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_request;

    PERFORM public.record_control_approval(v_request.action_type, v_request.id, p_checker_id::text, 'REJECT',
                                           COALESCE(p_checker_notes, 'Rejected from approvals console'));
    INSERT INTO public.audit_events (org_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
    VALUES (
      NULL, p_checker_id, trim(p_checker_email), 'OPERATIONS',
      'MONEY_MOVEMENT_REQUEST_REJECTED', 'maker_checker_requests', v_request.id::text,
      jsonb_build_object('action_type', v_request.action_type, 'payload', v_request.payload,
                         'maker_email', v_request.maker_email, 'checker_notes', p_checker_notes),
      'db-function', 'MCM-' || v_request.id::text, 'MCM-' || v_request.id::text
    );

    RETURN jsonb_build_object('status', 'REJECTED', 'request_id', v_request.id,
                              'action_type', v_request.action_type, 'payload', v_request.payload);
  END IF;

  -- APPROVE: execute the underlying posting function inside this transaction.
  -- Any raise rolls back the approval itself — the request stays PENDING and
  -- is safe to retry after the underlying problem is fixed.
  IF v_request.action_type = 'AGENCY_SETTLEMENT_RUN' THEN
    DECLARE
      v_batch public.settlement_batches;
    BEGIN
      SELECT * INTO v_batch FROM public.run_daily_settlement(
        (v_request.payload->>'org_id')::uuid,
        v_request.payload->>'currency',
        (v_request.payload->>'settlement_date')::date);
      v_result := jsonb_build_object(
        'batch_id', v_batch.id, 'batch_reference', v_batch.batch_reference,
        'settlement_date', v_batch.settlement_date, 'currency', v_batch.currency,
        'status', v_batch.status, 'total_commission_amount', v_batch.total_commission_amount,
        'total_agent_count', v_batch.total_agent_count);
    END;

  ELSIF v_request.action_type = 'MERCHANT_SETTLEMENT_RUN' THEN
    DECLARE
      v_batch public.merchant_settlement_batches;
    BEGIN
      SELECT * INTO v_batch FROM public.run_merchant_settlement(
        (v_request.payload->>'merchant_id')::uuid,
        v_request.payload->>'currency');
      v_result := jsonb_build_object(
        'batch_id', v_batch.id, 'batch_reference', v_batch.batch_reference,
        'currency', v_batch.currency, 'status', v_batch.status,
        'transaction_count', v_batch.transaction_count, 'gross_amount', v_batch.gross_amount,
        'total_fees', v_batch.total_fees, 'net_amount', v_batch.net_amount);
    END;

  ELSIF v_request.action_type = 'AGENCY_TRANSACTION_REVERSAL' THEN
    DECLARE
      v_tx public.agency_transactions;
    BEGIN
      SELECT * INTO v_tx FROM public.reverse_agency_transaction(
        (v_request.payload->>'transaction_id')::uuid,
        trim(p_checker_email),
        v_request.payload->>'reason');
      v_result := jsonb_build_object(
        'transaction_id', v_tx.id, 'transaction_reference', v_tx.reference,
        'status', v_tx.status, 'reversal_reason', v_request.payload->>'reason');
    END;

  ELSE
    RAISE EXCEPTION 'MAKER_CHECKER_ACTION_NOT_EXECUTABLE_%', v_request.action_type;
  END IF;

  UPDATE public.maker_checker_requests
  SET status = 'EXECUTED', checker_id = p_checker_id, checker_email = trim(p_checker_email),
      checker_notes = p_checker_notes, approved_at = NOW(), executed_at = NOW(),
      execution_result = v_result
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  PERFORM public.record_control_approval(v_request.action_type, v_request.id, p_checker_id::text, 'APPROVE',
                                         COALESCE(p_checker_notes, 'Approved and executed from approvals console'));
  INSERT INTO public.audit_events (org_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (
    NULL, p_checker_id, trim(p_checker_email), 'OPERATIONS',
    'MONEY_MOVEMENT_REQUEST_EXECUTED', 'maker_checker_requests', v_request.id::text,
    jsonb_build_object('action_type', v_request.action_type, 'payload', v_request.payload,
                       'maker_email', v_request.maker_email, 'checker_email', trim(p_checker_email),
                       'execution_result', v_result),
    'db-function', 'MCM-' || v_request.id::text, 'MCM-' || v_request.id::text
  );

  RETURN jsonb_build_object('status', 'EXECUTED', 'request_id', v_request.id,
                            'action_type', v_request.action_type, 'payload', v_request.payload,
                            'execution_result', v_result);
END;
$function$;

-- =============================================================================
-- S4. Daily close v7 — pending money-movement requests (v6 preserved verbatim)
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
    AND t.transaction_reference NOT LIKE 'PAYOUT-REVERSAL-TEST-%'
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
    AND NOT EXISTS (SELECT 1 FROM public.merchant_payout_requests pr WHERE pr.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.fx_revaluations fv WHERE fv.ledger_transaction_id = t.id);

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
-- S5. Perimeter (house posture: deny by default, service_role only)
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.submit_money_movement_request(character varying, jsonb, uuid, character varying, character varying, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_money_movement_request(character varying, jsonb, uuid, character varying, character varying, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.decide_money_movement_request(uuid, uuid, character varying, character varying, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_money_movement_request(uuid, uuid, character varying, character varying, text) TO service_role;

-- =============================================================================
-- S6. Reversal journals are linked, not orphans (defect found by this pass:
--     M8's KP-2026-CLAW-E2E1-REV had been the daily close's standing orphan
--     since it was posted — the reversal journal had no link column on
--     agency_transactions, unlike customer_fx_swaps which has one).
-- =============================================================================

ALTER TABLE public.agency_transactions
  ADD COLUMN IF NOT EXISTS reversal_ledger_transaction_id UUID REFERENCES public.ledger_transactions(id);

COMMENT ON COLUMN public.agency_transactions.reversal_ledger_transaction_id IS 'The journal that inverted this transaction (posted by reverse_agency_transaction / the checked reversal path). Makes the -REV journal first-class linked, not an orphan.';

-- Backfill: link the two existing reversal journals deterministically by
-- reference convention (<original-ref>-REV).
UPDATE public.agency_transactions a
SET reversal_ledger_transaction_id = t.id
FROM public.ledger_transactions t
WHERE t.transaction_reference = a.reference || '-REV'
  AND a.reversal_ledger_transaction_id IS NULL;

-- The reversal function now stamps the link (signature unchanged, incl. defaults):

CREATE OR REPLACE FUNCTION public.reverse_agency_transaction(p_transaction_id uuid, p_reversed_by character varying, p_reason text DEFAULT NULL::text)
 RETURNS agency_transactions
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_tx public.agency_transactions;
  v_journal public.ledger_transactions;
  v_journal_debits NUMERIC(24,2);
  v_commission public.agent_commissions;
  v_wallet_float public.ledger_accounts;
  v_cash_hand public.ledger_accounts;
  v_fee_revenue public.ledger_accounts;
  v_commission_expense public.ledger_accounts;
  v_commission_payable public.ledger_accounts;
  v_amount NUMERIC(24,2);
  v_fee NUMERIC(24,2);
  v_comm NUMERIC(24,2);
  v_ledger_tx_id UUID;
  v_cash_delta NUMERIC(24,2) := 0;
  v_float_delta NUMERIC(24,2) := 0;
  v_has_commission BOOLEAN := FALSE;
BEGIN
  IF p_reversed_by IS NULL OR length(trim(p_reversed_by)) = 0 THEN
    RAISE EXCEPTION 'REVERSAL_ACTOR_REQUIRED';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 20 THEN
    RAISE EXCEPTION 'REVERSAL_REASON_REQUIRED: provide a meaningful reason (min 20 chars)';
  END IF;

  SELECT * INTO v_tx FROM public.agency_transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'AGENCY_TRANSACTION_NOT_FOUND';
  END IF;
  IF v_tx.status <> 'SUCCESSFUL' THEN
    RAISE EXCEPTION 'AGENCY_TRANSACTION_NOT_REVERSIBLE_STATUS_%', v_tx.status;
  END IF;
  IF EXISTS (SELECT 1 FROM public.ledger_transactions WHERE transaction_reference = v_tx.reference || '-REV') THEN
    RAISE EXCEPTION 'AGENCY_TRANSACTION_ALREADY_REVERSED';
  END IF;

  SELECT * INTO v_journal FROM public.ledger_transactions WHERE id = v_tx.ledger_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOURNAL_MISSING_FOR_TRANSACTION';
  END IF;

  -- Sanity: the journal must match the operational row before we invert it.
  SELECT COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0) INTO v_journal_debits
  FROM public.ledger_entries WHERE transaction_id = v_journal.id;
  v_amount := COALESCE(v_tx.amount, 0);
  v_fee := COALESCE(v_tx.customer_fee, 0);
  v_comm := COALESCE(v_tx.agent_commission, 0);
  IF v_journal_debits <> (v_amount + v_fee + v_comm) THEN
    RAISE EXCEPTION 'JOURNAL_SHAPE_UNEXPECTED: journal debits % vs transaction amount+fee+commission % — refusing to invert blindly',
      v_journal_debits, v_amount + v_fee + v_comm;
  END IF;

  SELECT * INTO v_commission FROM public.agent_commissions
  WHERE agency_transaction_id = v_tx.id AND amount > 0
  ORDER BY earned_at LIMIT 1;
  v_has_commission := FOUND;
  IF v_has_commission AND v_commission.status = 'CLAWED_BACK' THEN
    RAISE EXCEPTION 'AGENCY_TRANSACTION_ALREADY_REVERSED';
  END IF;

  SELECT la.* INTO v_cash_hand FROM public.agent_float_accounts afa
  JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
  WHERE afa.agent_id = v_tx.agent_id AND afa.account_kind = 'CASH_IN_HAND' AND afa.currency = v_tx.currency
  FOR UPDATE OF la;
  SELECT la.* INTO v_wallet_float FROM public.agent_float_accounts afa
  JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
  WHERE afa.agent_id = v_tx.agent_id AND afa.account_kind = 'WALLET_FLOAT' AND afa.currency = v_tx.currency
  FOR UPDATE OF la;
  IF v_cash_hand.id IS NULL OR v_wallet_float.id IS NULL THEN
    RAISE EXCEPTION 'AGENT_FLOAT_NOT_PROVISIONED';
  END IF;
  SELECT * INTO v_fee_revenue FROM public.ledger_accounts
  WHERE account_number = 'AGENCY-FEE-REVENUE-' || v_tx.currency AND currency = v_tx.currency;
  SELECT * INTO v_commission_expense FROM public.ledger_accounts
  WHERE account_number = 'COMMISSION-EXPENSE-' || v_tx.currency AND currency = v_tx.currency;
  SELECT * INTO v_commission_payable FROM public.ledger_accounts
  WHERE account_number = 'COMMISSION-PAYABLE-' || v_tx.currency AND currency = v_tx.currency;

  -- Commission already settled to the agent's float: the clawback must come
  -- back out of that float (the payable was consumed by settlement).
  IF v_has_commission AND v_commission.status = 'PAID' THEN
    IF v_wallet_float.balance < v_comm THEN
      RAISE EXCEPTION 'AGENT_FLOAT_INSUFFICIENT_FOR_CLAWBACK: agent float holds % but the clawback needs % — settle this manually with the agent',
        v_wallet_float.balance, v_comm;
    END IF;
  END IF;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_journal.org_id, v_tx.reference || '-REV',
          'Reversal of agency transaction ' || v_tx.reference || ' (' || v_tx.transaction_type || ' ' || v_tx.currency || ' ' || v_amount::text ||
          ', fee ' || v_fee::text || ', commission ' || v_comm::text || '): ' || trim(p_reason),
          v_amount + v_fee + v_comm, v_tx.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  -- Money legs (inverted).
  IF v_tx.transaction_type = 'CASH_IN' THEN
    v_float_delta := v_float_delta + v_amount;
    v_cash_delta := v_cash_delta - v_amount;
    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES
      (v_ledger_tx_id, v_wallet_float.id, 'CREDIT', v_amount, v_tx.currency, 'Reversal: cash-in wallet float restored'),
      (v_ledger_tx_id, v_cash_hand.id, 'DEBIT', v_amount, v_tx.currency, 'Reversal: physical cash returned to customer');
  ELSE
    v_cash_delta := v_cash_delta + v_amount;
    v_float_delta := v_float_delta - v_amount;
    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES
      (v_ledger_tx_id, v_cash_hand.id, 'CREDIT', v_amount, v_tx.currency, 'Reversal: dispensed cash recovered'),
      (v_ledger_tx_id, v_wallet_float.id, 'DEBIT', v_amount, v_tx.currency, 'Reversal: cash-out wallet float restored');
  END IF;

  -- Fee legs (inverted): the fee returns to the agent's cash position so the
  -- customer can be refunded in cash; revenue is reversed.
  IF v_fee > 0 THEN
    v_cash_delta := v_cash_delta + v_fee;
    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES
      (v_ledger_tx_id, v_fee_revenue.id, 'DEBIT', v_fee, v_tx.currency, 'Reversal: agency fee revenue reversed'),
      (v_ledger_tx_id, v_cash_hand.id, 'CREDIT', v_fee, v_tx.currency, 'Reversal: collected fee returned (agent refunds customer)');
  END IF;

  -- Commission clawback legs.
  IF v_has_commission AND v_comm > 0 THEN
    IF v_commission.status = 'PAID' THEN
      -- Recovery from the agent's float (settlement already consumed the payable).
      v_float_delta := v_float_delta - v_comm;
      INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
      VALUES
        (v_ledger_tx_id, v_wallet_float.id, 'DEBIT', v_comm, v_tx.currency, 'Clawback: settled commission recovered from agent float'),
        (v_ledger_tx_id, v_commission_expense.id, 'CREDIT', v_comm, v_tx.currency, 'Clawback: commission expense reversed (settled commission)');
    ELSE
      -- Not yet settled: the accrued payable and the expense simply invert.
      INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
      VALUES
        (v_ledger_tx_id, v_commission_payable.id, 'DEBIT', v_comm, v_tx.currency, 'Clawback: commission payable reversed'),
        (v_ledger_tx_id, v_commission_expense.id, 'CREDIT', v_comm, v_tx.currency, 'Clawback: commission expense reversed');
    END IF;
  END IF;

  -- Single net update per account.
  UPDATE public.ledger_accounts SET balance = balance + v_cash_delta, updated_at = NOW() WHERE id = v_cash_hand.id;
  UPDATE public.ledger_accounts SET balance = balance + v_float_delta, updated_at = NOW() WHERE id = v_wallet_float.id;
  IF v_fee > 0 THEN
    UPDATE public.ledger_accounts SET balance = balance - v_fee, updated_at = NOW() WHERE id = v_fee_revenue.id;
  END IF;
  IF v_has_commission AND v_comm > 0 THEN
    UPDATE public.ledger_accounts SET balance = balance + v_comm, updated_at = NOW() WHERE id = v_commission_expense.id;
    IF v_commission.status <> 'PAID' THEN
      UPDATE public.ledger_accounts SET balance = balance - v_comm, updated_at = NOW() WHERE id = v_commission_payable.id;
    END IF;
  END IF;

  UPDATE public.agency_transactions SET status = 'REVERSED', reversal_ledger_transaction_id = v_ledger_tx_id
  WHERE id = v_tx.id
  RETURNING * INTO v_tx;

  IF v_has_commission AND v_comm > 0 THEN
    UPDATE public.agent_commissions
    SET status = 'CLAWED_BACK', clawed_back_at = NOW(), clawed_back_by = p_reversed_by
    WHERE id = v_commission.id;
  END IF;

  INSERT INTO public.audit_events (org_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (
    v_journal.org_id,
    COALESCE(
      (SELECT up.auth_user_id FROM public.user_profiles up WHERE up.email = trim(p_reversed_by) LIMIT 1),
      '00000000-0000-4000-8000-000000000001'::uuid
    ),
    p_reversed_by,
    'AGENCY_OPS',
    'AGENCY_TRANSACTION_REVERSED',
    'agency_transactions',
    v_tx.id::text,
    jsonb_build_object(
      'reference', v_tx.reference,
      'reversal_reference', v_tx.reference || '-REV',
      'transaction_type', v_tx.transaction_type,
      'amount', v_amount, 'fee', v_fee, 'commission', v_comm,
      'commission_clawback', CASE WHEN v_comm = 0 THEN 'NONE' WHEN v_commission.status = 'PAID' THEN 'RECOVERED_FROM_FLOAT' ELSE 'PAYABLE_INVERTED' END,
      'reason', trim(p_reason)
    ),
    'ops-console',
    'REV-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
    'REV-' || v_tx.id::text
  );

  RETURN v_tx;
END;
$function$
