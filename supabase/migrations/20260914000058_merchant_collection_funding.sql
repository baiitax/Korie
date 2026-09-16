-- =============================================================================
-- 20260914000058_merchant_collection_funding.sql
--
-- Merchant collection funding source (assessment F11 / backlog B6 remainder):
-- "confirm_merchant_collection debits a self-created
-- MERCHANT-COLLECTIONS-CLEARING ASSET account that nothing ever funds — the
-- debit side of a collection comes from nowhere."
--
--   S1  confirm_merchant_collection v2 (signature unchanged): the debit side
--       of a confirmed collection is now MERCHANT-ACQUIRING-RECEIVABLE-<ccy>
--       (ASSET) — the acquiring rail owes KoriePay the gross collected, and
--       external settlement into the bank account is pending bank-rail
--       integration (B4). When bank statements exist, the receivable is
--       cleared DEBIT bank / CREDIT receivable by a statement-matched
--       reconciliation (the aggregator-recon pattern applied to acquiring).
--       This is deliberately NOT a fabricated bank balance: it names the
--       counterparty exposure and ages honestly.
--
--       Why not keep MERCHANT-COLLECTIONS-CLEARING: (a) the name lied —
--       nothing ever cleared it; it was a black hole that only accumulated
--       debits; (b) as an ASSET receiving DEBITs it goes negative, and its
--       %CLEARING% name made every confirmed collection trip the daily
--       close's negative-custodial detector — a false alarm by naming.
--       No committed rows or accounts with the old name exist (verified),
--       so this is a clean replacement, not a migration of history.
--
--   S2  run_daily_financial_close v6 (signature unchanged; all v5 exception
--       logic preserved verbatim): the acquiring receivable is surfaced
--       (per-currency balances) and a nonzero receivable with no movement
--       for >3 days counts as a close exception — money the rails owe us
--       that was never externally confirmed. Today's fresh collections do
--       not fire it; a stalled rail does.
--
-- Honest limits (documented):
--   - The only production collection channel is BANK_TRANSFER acquiring
--     (hardcoded at collection creation). A CASH/agent-collected channel
--     would need its own funding leg (agent cash-in-hand / merchant
--     retained-cash model) — future work if such a channel ships.
--   - The receivable's bank-side clearing leg is B4-blocked, exactly like
--     the merchant payout clearing on the settlement side.
--
-- No existing function signature changes.
-- =============================================================================

-- =============================================================================
-- S1. confirm_merchant_collection v2 — real funding source
-- =============================================================================

CREATE OR REPLACE FUNCTION public.confirm_merchant_collection(p_transaction_id uuid, p_merchant_id uuid)
RETURNS public.merchant_payment_transactions
LANGUAGE plpgsql
AS $function$
DECLARE
  v_tx public.merchant_payment_transactions;
  v_org_id UUID;
  v_settlement_account_id UUID;
  v_ledger_tx_id UUID;
  v_gross NUMERIC(24,2);
  v_net NUMERIC(24,2);
  v_fee NUMERIC(24,2);
  v_receivable_id UUID;
  v_fee_revenue_id UUID;
BEGIN
  SELECT * INTO v_tx FROM public.merchant_payment_transactions
  WHERE id = p_transaction_id AND merchant_id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COLLECTION_NOT_FOUND';
  END IF;

  IF v_tx.status = 'SUCCESSFUL' THEN
    RETURN v_tx; -- already confirmed, idempotent
  END IF;

  IF v_tx.status NOT IN ('PENDING_PROVIDER_INTEGRATION', 'PROCESSING') THEN
    RAISE EXCEPTION 'COLLECTION_NOT_CONFIRMABLE';
  END IF;

  SELECT org_id, settlement_ledger_account_id INTO v_org_id, v_settlement_account_id
  FROM public.merchant_profiles WHERE id = p_merchant_id;

  IF v_settlement_account_id IS NULL THEN
    RAISE EXCEPTION 'MERCHANT_SETTLEMENT_ACCOUNT_NOT_PROVISIONED';
  END IF;

  v_gross := v_tx.amount;
  v_net := v_tx.net_amount;
  v_fee := COALESCE(v_tx.fee, 0);

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_org_id, v_tx.reference, 'Merchant in-store collection — cashier confirmed (gross)', v_gross, v_tx.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  -- Funding source (F11): the acquiring rail owes KoriePay the gross. This
  -- receivable is the debit side of the collection; it clears against the
  -- bank account when statement-matched confirmation exists (B4).
  INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
  SELECT v_org_id, 'MERCHANT-ACQUIRING-RECEIVABLE-' || v_tx.currency, 'Merchant Acquiring Receivable (rail owes gross; bank confirmation pending B4) — ' || v_tx.currency, 'ASSET', v_tx.currency,
         (SELECT country FROM public.organizations WHERE id = v_org_id), 0.00
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ledger_accounts WHERE currency = v_tx.currency AND account_number = 'MERCHANT-ACQUIRING-RECEIVABLE-' || v_tx.currency
  );
  SELECT id INTO v_receivable_id FROM public.ledger_accounts
  WHERE currency = v_tx.currency AND account_number = 'MERCHANT-ACQUIRING-RECEIVABLE-' || v_tx.currency;

  IF v_fee > 0 THEN
    INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
    SELECT v_org_id, 'MERCHANT-FEE-REVENUE-' || v_tx.currency, 'Merchant Collection Fee Revenue — ' || v_tx.currency, 'REVENUE', v_tx.currency,
           (SELECT country FROM public.organizations WHERE id = v_org_id), 0.00
    WHERE NOT EXISTS (
      SELECT 1 FROM public.ledger_accounts WHERE currency = v_tx.currency AND account_number = 'MERCHANT-FEE-REVENUE-' || v_tx.currency
    );
    SELECT id INTO v_fee_revenue_id FROM public.ledger_accounts
    WHERE currency = v_tx.currency AND account_number = 'MERCHANT-FEE-REVENUE-' || v_tx.currency;
  END IF;

  -- Gross posting: the full amount collected at the till is acquired through
  -- the bank rail (receivable, external confirmation pending); the merchant
  -- is owed the net and KoriePay has earned the fee.
  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES (v_ledger_tx_id, v_receivable_id, 'DEBIT', v_gross, v_tx.currency, 'In-store collection: gross acquired via bank rail — external settlement confirmation pending (B4)');

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES (v_ledger_tx_id, v_settlement_account_id, 'CREDIT', v_net, v_tx.currency, 'In-store collection credited to merchant settlement account (net of fee)');

  IF v_fee > 0 THEN
    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES (v_ledger_tx_id, v_fee_revenue_id, 'CREDIT', v_fee, v_tx.currency, 'Merchant collection fee revenue recognised at confirmation');
  END IF;

  UPDATE public.ledger_accounts SET balance = balance + v_net, updated_at = NOW() WHERE id = v_settlement_account_id;
  UPDATE public.ledger_accounts SET balance = balance - v_gross, updated_at = NOW() WHERE id = v_receivable_id;
  IF v_fee > 0 THEN
    UPDATE public.ledger_accounts SET balance = balance + v_fee, updated_at = NOW() WHERE id = v_fee_revenue_id;
  END IF;

  UPDATE public.merchant_payment_transactions
  SET status = 'SUCCESSFUL', ledger_transaction_id = v_ledger_tx_id, settled_at = NOW()
  WHERE id = p_transaction_id
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$function$;

-- =============================================================================
-- S2. Daily close v6 — acquiring receivable visibility + aging exception
--      (v5 logic preserved verbatim)
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
               + v_acquiring_aging;

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
      'merchant_acquiring_aging_over_3d', v_acquiring_aging
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
