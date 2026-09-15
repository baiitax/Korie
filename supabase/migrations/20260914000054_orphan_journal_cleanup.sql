-- =============================================================================
-- 20260914000054_orphan_journal_cleanup.sql
--
-- Orphan-journal cleanup (assessment open item: "linkage/write-off of the
-- 15 orphan journals") + orphan-DETECTION repair.
--
-- Investigation of the 16 journals the daily close flagged (15 at last count
-- plus the CASHVAR-RES variance resolution added by migration 000052) found
-- three distinct families:
--
--   A. FALSE POSITIVES — real journals linked to operational records the
--      close function never checked:
--        - 2 customer FX swap journals   -> customer_fx_swaps.ledger_transaction_id
--        - 1 merchant payout journal     -> merchant_payout_requests.ledger_transaction_id
--      Fix: add those tables to the orphan detection (S3).
--
--   B. MISSING LINK COLUMN — the 4 FX swap reversal journals (-REV-NGN/-REV-
--      XOF) reverse swaps whose rows exist, but customer_fx_swaps has no
--      reversal link column. Their descriptions name the exact swap they
--      reverse and their per-account net effect is 0.00 (verified).
--      Fix: add reversal_ledger_transaction_id and link them with guarded,
--      reference-matched UPDATEs (S1/S2); correct the swap rows' status to
--      REVERSED, which the books already prove.
--
--   C. SANCTIONED / DOCUMENTED NO-OPERATIONAL-ROW JOURNALS — seed and demo
--      funding (SEED-%, DEMO-FUND-%), the reconciliation variance-resolution
--      family (CASHVAR-RES-%, audited via the resolution columns), the Task I
--      security-test payout reversal (PAYOUT-REVERSAL-TEST-%, net-zero vs its
--      original), and one customer transfer journal whose customer row was
--      deleted during sandbox cleanup (KP-2026-CTX-2AF878C5, journal retained
--      because ledger entries are immutable).
--      Fix: a documented, justified exclusion list in the close function (S3)
--      so the orphan counter flags UNEXPLAINED journals only — any journal
--      from a novel family still gets flagged.
--
-- No existing function signature changes.
-- =============================================================================

-- =============================================================================
-- S1. Reversal link on FX swaps
-- =============================================================================

ALTER TABLE public.customer_fx_swaps
  ADD COLUMN IF NOT EXISTS reversal_ledger_transaction_id UUID REFERENCES public.ledger_transactions(id);

-- =============================================================================
-- S2. Data repair — link the reversal journals (guarded: exact reference
--     match only, deterministic leg choice; no fabricated pairings) and
--     correct swap status to what the books already prove.
-- =============================================================================

UPDATE public.customer_fx_swaps s
SET reversal_ledger_transaction_id = (
      SELECT min(t.id::text)::uuid
      FROM public.ledger_transactions t
      WHERE t.transaction_reference IN (s.reference || '-REV-NGN', s.reference || '-REV-XOF')
        AND t.status = 'REVERSED'
    ),
    status = 'REVERSED'
WHERE s.status = 'COMPLETED'
  AND s.reversal_ledger_transaction_id IS NULL
  AND EXISTS (
      SELECT 1 FROM public.ledger_transactions t
      WHERE t.transaction_reference IN (s.reference || '-REV-NGN', s.reference || '-REV-XOF')
        AND t.status = 'REVERSED'
    );

-- =============================================================================
-- S3. run_daily_financial_close v3 — complete orphan detection
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
BEGIN
  -- Journals and volumes for the close date.
  SELECT count(DISTINCT t.id),
         COALESCE(SUM(CASE WHEN e.entry_type = 'DEBIT'  THEN e.amount ELSE 0 END), 0)::bigint,
         COALESCE(SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE 0 END), 0)::bigint
  INTO v_journals, v_debit_vol, v_credit_vol
  FROM public.ledger_transactions t
  JOIN public.ledger_entries e ON e.transaction_id = t.id
  WHERE t.created_at::date = p_close_date;

  -- Unbalanced journals posted on the close date (should be impossible now).
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

  -- Per-currency equation.
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

  -- Accounts whose stored balance is not journal-derived.
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

  -- Wallets disagreeing with their ledger accounts.
  SELECT jsonb_agg(jsonb_build_object('wallet_id', w.id, 'wallet_balance', w.balance, 'ledger_balance', la.balance))
  INTO v_wallet_desync
  FROM public.wallets w
  JOIN public.ledger_accounts la ON la.id = w.ledger_account_id
  WHERE w.balance <> la.balance;

  -- Wallets that hold a balance with no ledger account behind them.
  SELECT jsonb_agg(jsonb_build_object('wallet_id', w.id, 'balance', w.balance))
  INTO v_unbacked
  FROM public.wallets w
  WHERE w.ledger_account_id IS NULL AND w.balance <> 0;

  -- Negative custodial accounts (escrow / clearing / FX book).
  SELECT jsonb_agg(jsonb_build_object('account', la.account_number, 'balance', la.balance))
  INTO v_negative
  FROM public.ledger_accounts la
  WHERE la.balance < 0
    AND (la.account_number LIKE '%ESCROW%' OR la.account_number LIKE '%CLEARING%' OR la.account_number LIKE '%FX-BOOK%');

  -- Clearing/escrow money sitting unmoved for more than 3 days (stuck
  -- provider settlements — the de facto transfer outage signature).
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

  -- EARNED commissions unpaid for more than 7 days.
  SELECT count(*), COALESCE(SUM(amount), 0) INTO v_commission_aging_count, v_commission_aging_amount
  FROM public.agent_commissions
  WHERE status IN ('EARNED', 'PENDING_SETTLEMENT')
    AND earned_at < NOW() - INTERVAL '7 days';
  v_commission_aging := jsonb_build_object('count', v_commission_aging_count, 'amount', v_commission_aging_amount);

  -- Deferred (unearned) transfer fees per currency — informational.
  SELECT jsonb_object_agg(la.currency, la.balance)
  INTO v_deferred_fees
  FROM public.ledger_accounts la
  WHERE la.account_number LIKE 'TRANSFER-FEE-DEFERRED-%' AND la.balance <> 0;

  -- Orphan journals: posted but linked to no operational record. Every
  -- operational table that carries a ledger link is checked, and every
  -- excluded reference family is justified below — the counter flags
  -- UNEXPLAINED journals, so a novel family still surfaces.
  SELECT count(*) INTO v_orphans
  FROM public.ledger_transactions t
  WHERE t.transaction_reference NOT LIKE 'ADJ-%'
    AND t.transaction_reference NOT LIKE 'FUND-%'
    AND t.transaction_reference NOT LIKE 'KP-%-FUND-%'
    -- SEED-%: demo seed funding (treasury -> account). The journal IS the
    -- record; there is no operational request by design.
    AND t.transaction_reference NOT LIKE 'SEED-%'
    -- DEMO-FUND-%: Adashi E2E test-customer wallet funding from treasury.
    AND t.transaction_reference NOT LIKE 'DEMO-FUND-%'
    -- CASHVAR-RES-%: reconciliation variance resolutions posted via
    -- post_adjustment_journal; audited and linked through the
    -- agent_cash_reconciliations resolution columns.
    AND t.transaction_reference NOT LIKE 'CASHVAR-RES-%'
    -- PAYOUT-REVERSAL-TEST-%: Task I security-test payout reversal; net-zero
    -- against its original journal; no operational row by design.
    AND t.transaction_reference NOT LIKE 'PAYOUT-REVERSAL-TEST-%'
    -- KP-2026-CTX-2AF878C5: customer transfer whose customer_transactions
    -- row was deleted during sandbox cleanup; the journal is retained
    -- (entries are immutable). Verified: test wallet -> NIP clearing 1,050.
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

  -- ---- Reconciliation & suspense (§16) ----
  -- Unresolved cash variances, with ageing detail for anything older than 3 days.
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

  -- Non-zero suspense balances: every open break is visible in the close.
  SELECT jsonb_object_agg(la.currency, la.balance)
  INTO v_suspense_balances
  FROM public.ledger_accounts la
  WHERE la.account_number LIKE 'SUSPENSE-%' AND la.balance <> 0;
  SELECT count(*) INTO v_suspense_nonzero
  FROM public.ledger_accounts la
  WHERE la.account_number LIKE 'SUSPENSE-%' AND la.balance <> 0;

  -- F17 class: zero-total records asserting MATCHED — a record that compares
  -- nothing to nothing and asserts a match is a false positive, not evidence.
  SELECT count(*) INTO v_false_matches
  FROM public.aggregator_reconciliations
  WHERE status = 'MATCHED'
    AND COALESCE(internal_ledger_total, 0) = 0
    AND COALESCE(provider_gateway_total, 0) = 0
    AND COALESCE(bank_settled_total, 0) = 0
    AND COALESCE(discrepancy_count, 0) = 0;

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
               + v_false_matches;

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
      'false_match_reconciliations', v_false_matches
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
