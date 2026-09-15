-- =============================================================================
-- 20260914000056_aggregator_recon.sql
--
-- Automated aggregator reconciliation (assessment §16: "aggregator
-- reconciliation remains a manual daily item"; the F17 lesson: a record that
-- compares nothing to nothing and asserts MATCHED is a false positive).
--
--   S1  aggregator_reconciliations: currency dimension + idempotency key.
--   S2  run_aggregator_reconciliation(p_date, p_run_by): computes the
--       INTERNAL side from real journal movements on each aggregator's
--       float/escrow/reserve accounts, and the BANK side from ingested
--       bank_statements (minor units, converted) matched by currency and
--       country. Honest status semantics:
--         - nothing on either side        -> NO ROW (nothing to reconcile;
--           a zero-total day never asserts MATCHED)
--         - internal movement, no bank    -> PENDING_REVIEW (external data
--           awaited — ages into a close exception after 3 days)
--         - both sides present, equal     -> MATCHED (computed, not assumed)
--         - both sides present, unequal   -> MISMATCH with variance
--         - bank activity, books silent   -> MISSING (red flag)
--       provider_gateway_total stays NULL until a gateway-report ingestion
--       surface exists — never fabricated. Re-runs are idempotent and never
--       reopen a row an investigator RESOLVED.
--   S3  run_daily_financial_close v4: aged PENDING_REVIEW (>3 days) and open
--       MISMATCH aggregator rows count as close exceptions.
--
-- No existing function signature changes.
-- =============================================================================

-- =============================================================================
-- S1. Schema
-- =============================================================================

ALTER TABLE public.aggregator_reconciliations
  ADD COLUMN IF NOT EXISTS currency CHARACTER VARYING(3);

-- The seeded 2026-09-13 row belongs to the sole NG/NGN aggregator.
UPDATE public.aggregator_reconciliations ar
SET currency = a.currency
FROM public.aggregators a
WHERE ar.aggregator_id = a.id AND ar.currency IS NULL;

ALTER TABLE public.aggregator_reconciliations
  ALTER COLUMN currency SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_aggregator_recon_day
  ON public.aggregator_reconciliations (aggregator_id, reconciliation_date, currency);

-- Totals sourced from external data must be nullable: "no statement ingested
-- yet" is NULL, never a fabricated 0 (F17 lesson — zero-assertions invited a
-- false MATCHED, and the close's own false-match detector would flag it).
-- internal_ledger_total stays NOT NULL: the runner always computes it.
ALTER TABLE public.aggregator_reconciliations
  ALTER COLUMN bank_settled_total DROP NOT NULL,
  ALTER COLUMN provider_gateway_total DROP NOT NULL,
  ALTER COLUMN variance_amount DROP NOT NULL,
  ALTER COLUMN discrepancy_count DROP NOT NULL;

-- =============================================================================
-- S2. The automated runner
-- =============================================================================

CREATE OR REPLACE FUNCTION public.run_aggregator_reconciliation(
  p_reconciliation_date date DEFAULT CURRENT_DATE,
  p_run_by character varying DEFAULT 'system')
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_row_count INT := 0;
  v_matched INT := 0;
  v_pending INT := 0;
  v_mismatch INT := 0;
  v_missing INT := 0;
  v_skipped INT := 0;
  v_internal NUMERIC(24,2);
  v_bank_minor BIGINT;
  v_bank_total NUMERIC(24,2);
  v_currency VARCHAR(3);
  v_status VARCHAR(24);
  v_variance NUMERIC(24,2);
  v_discrepancies INT;
  v_bank_label TEXT;
  r RECORD;
  v_org_id UUID;
BEGIN
  FOR r IN
    SELECT a.id AS aggregator_id, a.business_name, a.country,
           (SELECT la.currency FROM ledger_accounts la WHERE la.id = a.float_account_id) AS float_currency
    FROM public.aggregators a
    WHERE a.status = 'ACTIVE'
  LOOP
    v_currency := r.float_currency;
    IF v_currency IS NULL THEN
      CONTINUE; -- aggregator without a provisioned float account has no ledger side
    END IF;

    -- INTERNAL: net journal movement across the aggregator's accounts.
    SELECT COALESCE(SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END), 0)
    INTO v_internal
    FROM public.ledger_entries e
    WHERE e.account_id IN (
            SELECT a2.float_account_id FROM public.aggregators a2 WHERE a2.id = r.aggregator_id AND a2.float_account_id IS NOT NULL
            UNION
            SELECT a2.escrow_account_id FROM public.aggregators a2 WHERE a2.id = r.aggregator_id AND a2.escrow_account_id IS NOT NULL
            UNION
            SELECT a2.reserve_account_id FROM public.aggregators a2 WHERE a2.id = r.aggregator_id AND a2.reserve_account_id IS NOT NULL
          )
      AND e.created_at::date = p_reconciliation_date;

    -- BANK: ingested statements for this currency + country (minor units).
    -- NULL when no statement has been ingested — "no data" must not become
    -- "bank says zero" (that turns PENDING_REVIEW into a false MISMATCH).
    SELECT SUM(bs.total_credits_minor - bs.total_debits_minor),
           COALESCE(string_agg(DISTINCT ba.bank_name, ' / '), '')
    INTO v_bank_minor, v_bank_label
    FROM public.bank_statements bs
    JOIN public.bank_accounts ba ON ba.id = bs.bank_account_id
    WHERE bs.statement_date = p_reconciliation_date
      AND bs.currency = v_currency
      AND ba.country_code = r.country
      AND ba.is_active = true;
    v_bank_total := CASE WHEN v_bank_minor IS NULL THEN NULL ELSE v_bank_minor / 100.0 END;

    IF COALESCE(v_internal, 0) = 0 AND (v_bank_total IS NULL OR v_bank_total = 0) THEN
      v_skipped := v_skipped + 1;
      CONTINUE; -- nothing to reconcile — and no false MATCHED
    END IF;

    IF v_bank_total IS NULL THEN
      v_status := 'PENDING_REVIEW';
      v_variance := NULL;
      v_discrepancies := NULL;
    ELSIF v_bank_total = v_internal THEN
      v_status := 'MATCHED';
      v_variance := 0;
      v_discrepancies := 0;
    ELSIF COALESCE(v_internal, 0) = 0 AND v_bank_total <> 0 THEN
      v_status := 'MISSING';
      v_variance := -v_bank_total;
      v_discrepancies := 1;
    ELSE
      v_status := 'MISMATCH';
      v_variance := v_internal - v_bank_total;
      v_discrepancies := 1;
    END IF;

    INSERT INTO public.aggregator_reconciliations (
      aggregator_id, reconciliation_date, currency, channel_or_entity, provider_node,
      internal_ledger_total, provider_gateway_total, bank_settled_total, variance_amount, status, discrepancy_count, notes
    ) VALUES (
      r.aggregator_id, p_reconciliation_date, v_currency, 'AGENCY-NETWORK-DAILY',
      COALESCE(NULLIF(v_bank_label, ''), 'awaiting bank statement linkage'),
      v_internal, NULL, v_bank_total, v_variance, v_status, v_discrepancies,
      CASE WHEN v_status = 'PENDING_REVIEW'
           THEN 'Automated recon: internal ledger movement computed from journals; no bank statement ingested for this date yet.'
           WHEN v_status = 'MATCHED'
           THEN 'Automated recon: internal ledger movement equals ingested bank statement net settlement.'
           WHEN v_status = 'MISSING'
           THEN 'Automated recon: bank statement shows settlement activity with no corresponding ledger movement — investigate.'
           ELSE 'Automated recon: internal ledger movement disagrees with the ingested bank statement net settlement.'
      END
    )
    ON CONFLICT (aggregator_id, reconciliation_date, currency) DO UPDATE SET
      provider_node = EXCLUDED.provider_node,
      internal_ledger_total = EXCLUDED.internal_ledger_total,
      provider_gateway_total = EXCLUDED.provider_gateway_total,
      bank_settled_total = EXCLUDED.bank_settled_total,
      variance_amount = EXCLUDED.variance_amount,
      status = EXCLUDED.status,
      discrepancy_count = EXCLUDED.discrepancy_count,
      notes = EXCLUDED.notes
    WHERE public.aggregator_reconciliations.status <> 'RESOLVED'; -- never reopen an investigated row

    v_row_count := v_row_count + 1;
    CASE v_status
      WHEN 'MATCHED' THEN v_matched := v_matched + 1;
      WHEN 'PENDING_REVIEW' THEN v_pending := v_pending + 1;
      WHEN 'MISMATCH' THEN v_mismatch := v_mismatch + 1;
      ELSE v_missing := v_missing + 1;
    END CASE;
  END LOOP;

  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  INSERT INTO public.audit_events (org_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (
    v_org_id,
    '00000000-0000-4000-8000-000000000001',
    'system@koriepay.internal',
    'SYSTEM',
    'AGGREGATOR_RECONCILIATION_RUN',
    'aggregator_reconciliations',
    p_reconciliation_date::text,
    jsonb_build_object('reconciliation_date', p_reconciliation_date, 'run_by', p_run_by,
                       'rows_written', v_row_count, 'matched', v_matched, 'pending_review', v_pending,
                       'mismatch', v_mismatch, 'missing', v_missing, 'skipped_no_activity', v_skipped),
    'db-function',
    'AGGRECON-' || p_reconciliation_date::text,
    'AGGRECON-' || p_reconciliation_date::text
  );

  RETURN jsonb_build_object(
    'reconciliation_date', p_reconciliation_date,
    'rows_written', v_row_count,
    'matched', v_matched,
    'pending_review', v_pending,
    'mismatch', v_mismatch,
    'missing', v_missing,
    'skipped_no_activity', v_skipped
  );
END;
$function$;

-- =============================================================================
-- S3. Daily close v4 — aggregator recon exceptions
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
    AND t.transaction_reference <> 'KP-2026-CTX-2AF878C5'
    AND NOT EXISTS (SELECT 1 FROM public.customer_transactions c WHERE c.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.agency_transactions a WHERE a.ledger_transaction_id = t.id)
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
    AND NOT EXISTS (SELECT 1 FROM public.merchant_payout_requests pr WHERE pr.ledger_transaction_id = t.id);

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
               + v_recon_mismatch;

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
      'aggregator_recon_mismatches', v_recon_mismatch
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
