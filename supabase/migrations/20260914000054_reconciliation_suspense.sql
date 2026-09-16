-- =============================================================================
-- 20260914000054_reconciliation_suspense.sql
--
-- Reconciliation break-management (assessment §16: "no reconciliation engine
-- in operation, no suspense account in use, no break-management workflow;
-- detection time for a break is unbounded" and §43 "reconcile + approve").
--
--   S1  agent_cash_reconciliations: journal linkage + resolution columns and
--       the new lifecycle statuses
--   S2  submit_agent_cash_reconciliation v2 (signature unchanged):
--       a cash SHORTFALL now journals immediately — the agent's cash-in-hand
--       ledger position is corrected to physical reality and the missing
--       value is parked as a suspense claim (SUSPENSE-<ccy>, positive
--       balance) pending resolution. An OVERAGE does NOT journal (the
--       conservative choice: unexplained excess never creates claimable
--       ledger value); it is parked as OVERAGE_PENDING_REVIEW for ops.
--       Re-submission is refused once a variance has been journaled — the
--       correction path is an audited resolution, not a silent overwrite.
--   S3  resolve_cash_variance (new): the back-office resolution step
--       (maker = agent who submitted the count, checker = resolver — SoD by
--       construction). Shortfalls: RECOVERED_TO_TILL (reversal) or
--       WRITTEN_OFF (operational loss). Overages: DOCUMENTED_AS_MISSED_
--       TRANSACTION, RETURNED_TO_SENDER, or FORFEITED_TO_INCOME. Every
--       resolution with ledger impact posts through post_adjustment_journal
--       (balanced, attributed, audited).
--   S4  run_daily_financial_close v2: new metrics and exception counters —
--       unresolved cash variances (with >3-day ageing), non-zero suspense
--       balances per currency, and the F17 false-positive class
--       (zero-total records asserting MATCHED).
--
-- No existing function signature changes.
-- =============================================================================

-- =============================================================================
-- S1. Schema
-- =============================================================================

ALTER TABLE public.agent_cash_reconciliations ALTER COLUMN status TYPE CHARACTER VARYING(32);

ALTER TABLE public.agent_cash_reconciliations
  ADD COLUMN IF NOT EXISTS ledger_transaction_id UUID REFERENCES public.ledger_transactions(id),
  ADD COLUMN IF NOT EXISTS resolution CHARACTER VARYING(48),
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by CHARACTER VARYING(128);

ALTER TABLE public.agent_cash_reconciliations DROP CONSTRAINT IF EXISTS agent_cash_reconciliations_status_check;
ALTER TABLE public.agent_cash_reconciliations
  ADD CONSTRAINT agent_cash_reconciliations_status_check CHECK (
    status IN ('BALANCED', 'SUBMITTED', 'APPROVED', 'DISCREPANCY',
               'VARIANCE_JOURNALED', 'OVERAGE_PENDING_REVIEW', 'RESOLVED')
  );

-- =============================================================================
-- S2. submit_agent_cash_reconciliation v2 — variance journalisation
-- =============================================================================

CREATE OR REPLACE FUNCTION public.submit_agent_cash_reconciliation(p_agent_id uuid, p_actual_physical_cash numeric, p_notes text DEFAULT NULL::text)
 RETURNS agent_cash_reconciliations
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_currency VARCHAR(3);
  v_opening_cash NUMERIC(24,2);
  v_cash_in NUMERIC(24,2);
  v_cash_out NUMERIC(24,2);
  v_expected NUMERIC(24,2);
  v_difference NUMERIC(24,2);
  v_status VARCHAR(32);
  v_record public.agent_cash_reconciliations;
  v_existing public.agent_cash_reconciliations;
  v_cash_account_id UUID;
  v_suspense_account public.ledger_accounts;
  v_ledger_tx_id UUID;
  v_short NUMERIC(24,2);
  v_org_id UUID;
BEGIN
  SELECT currency INTO v_currency FROM public.agent_float_accounts
  WHERE agent_id = p_agent_id AND account_kind = 'CASH_IN_HAND' LIMIT 1;

  IF v_currency IS NULL THEN
    RAISE EXCEPTION 'AGENT_FLOAT_NOT_PROVISIONED';
  END IF;

  -- Immutability once a variance is on the books: corrections go through
  -- resolve_cash_variance, never through silently overwriting a count.
  SELECT * INTO v_existing FROM public.agent_cash_reconciliations
  WHERE agent_id = p_agent_id AND reconciliation_date = CURRENT_DATE FOR UPDATE;
  IF FOUND AND (v_existing.ledger_transaction_id IS NOT NULL OR v_existing.status IN ('VARIANCE_JOURNALED', 'RESOLVED')) THEN
    RAISE EXCEPTION 'RECONCILIATION_ALREADY_JOURNALED: today''s count is locked on the books — resolve the variance, do not resubmit';
  END IF;

  -- Opening cash = yesterday's actual physical count, or (first ever
  -- reconciliation) today's real CASH_IN_HAND ledger balance minus today's
  -- net cash movement so far, so day one is still ledger-derived, not zero.
  SELECT actual_physical_cash INTO v_opening_cash
  FROM public.agent_cash_reconciliations
  WHERE agent_id = p_agent_id AND reconciliation_date = CURRENT_DATE - INTERVAL '1 day';

  SELECT COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'CASH_IN'), 0),
         COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'CASH_OUT'), 0)
    INTO v_cash_in, v_cash_out
  FROM public.agency_transactions
  WHERE agent_id = p_agent_id
    AND status = 'SUCCESSFUL'
    AND created_at >= date_trunc('day', NOW());

  IF v_opening_cash IS NULL THEN
    SELECT la.balance INTO v_opening_cash
    FROM public.agent_float_accounts afa
    JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
    WHERE afa.agent_id = p_agent_id AND afa.account_kind = 'CASH_IN_HAND';
    v_opening_cash := COALESCE(v_opening_cash, 0) - v_cash_in + v_cash_out;
    IF v_opening_cash < 0 THEN v_opening_cash := 0; END IF;
  END IF;

  v_expected := v_opening_cash + v_cash_in - v_cash_out;
  v_difference := p_actual_physical_cash - v_expected;

  IF v_difference = 0 THEN
    v_status := 'APPROVED';
  ELSIF v_difference < 0 THEN
    v_status := 'VARIANCE_JOURNALED';
  ELSE
    v_status := 'OVERAGE_PENDING_REVIEW';
  END IF;

  INSERT INTO public.agent_cash_reconciliations (
    agent_id, reconciliation_date, currency, opening_cash, today_cash_in, today_cash_out,
    expected_closing_cash, actual_physical_cash, difference, status, notes
  ) VALUES (
    p_agent_id, CURRENT_DATE, v_currency, v_opening_cash, v_cash_in, v_cash_out,
    v_expected, p_actual_physical_cash, v_difference, v_status,
    COALESCE(p_notes, CASE
      WHEN v_status = 'APPROVED' THEN 'Vault balanced with internal ledger.'
      WHEN v_status = 'VARIANCE_JOURNALED' THEN 'Cash shortfall journaled to suspense pending resolution.'
      ELSE 'Cash overage recorded for supervisor review (no ledger value created).' END)
  )
  ON CONFLICT (agent_id, reconciliation_date) DO UPDATE SET
    actual_physical_cash = EXCLUDED.actual_physical_cash,
    today_cash_in = EXCLUDED.today_cash_in,
    today_cash_out = EXCLUDED.today_cash_out,
    expected_closing_cash = EXCLUDED.expected_closing_cash,
    difference = EXCLUDED.difference,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    submitted_at = NOW()
  RETURNING * INTO v_record;

  -- ---- Shortfall: journal immediately (§16 break-management) ----
  -- The agent's cash-in-hand ledger position drops to physical reality and
  -- the missing value becomes a suspense claim (positive suspense balance).
  IF v_difference < 0 THEN
    v_short := -v_difference;

    SELECT la.id, la.org_id INTO v_cash_account_id, v_org_id
    FROM public.agent_float_accounts afa
    JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
    WHERE afa.agent_id = p_agent_id AND afa.account_kind = 'CASH_IN_HAND' AND afa.currency = v_currency
    FOR UPDATE OF la;

    IF v_cash_account_id IS NULL THEN
      RAISE EXCEPTION 'AGENT_FLOAT_NOT_PROVISIONED';
    END IF;

    SELECT * INTO v_suspense_account FROM public.ledger_accounts
    WHERE account_number = 'SUSPENSE-' || v_currency AND currency = v_currency
    FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
      VALUES (v_org_id, 'SUSPENSE-' || v_currency, 'Operational Suspense — ' || v_currency, 'LIABILITY', v_currency,
              (SELECT country FROM public.organizations WHERE id = v_org_id), 0.00)
      ON CONFLICT (account_number) DO NOTHING;
      SELECT * INTO v_suspense_account FROM public.ledger_accounts
      WHERE account_number = 'SUSPENSE-' || v_currency AND currency = v_currency
      FOR UPDATE;
    END IF;

    INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
    VALUES (v_org_id,
            'CASHVAR-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(p_agent_id::text, 1, 8)),
            'Agent cash reconciliation shortfall: physical ' || v_currency || ' ' || p_actual_physical_cash::text ||
              ' vs expected ' || v_currency || ' ' || v_expected::text || ' — position corrected, suspense claim raised',
            v_short, v_currency, 'COMMITTED')
    RETURNING id INTO v_ledger_tx_id;

    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES
      (v_ledger_tx_id, v_cash_account_id, 'DEBIT', v_short, v_currency, 'Cash count shortfall: agent cash-in-hand position corrected to physical reality'),
      (v_ledger_tx_id, v_suspense_account.id, 'CREDIT', v_short, v_currency, 'Unexplained cash shortfall parked in suspense pending resolution');

    UPDATE public.ledger_accounts SET balance = balance - v_short, updated_at = NOW() WHERE id = v_cash_account_id;
    UPDATE public.ledger_accounts SET balance = balance + v_short, updated_at = NOW() WHERE id = v_suspense_account.id;

    UPDATE public.agent_cash_reconciliations
    SET status = 'VARIANCE_JOURNALED', ledger_transaction_id = v_ledger_tx_id
    WHERE id = v_record.id
    RETURNING * INTO v_record;
  END IF;

  RETURN v_record;
END;
$function$;

-- =============================================================================
-- S3. resolve_cash_variance — the checker step (SoD: agent submits the
--     count, back-office resolves; every ledger-moving resolution posts
--     through post_adjustment_journal).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.resolve_cash_variance(
  p_reconciliation_id uuid,
  p_resolution character varying,
  p_posted_by character varying,
  p_notes text DEFAULT NULL)
RETURNS agent_cash_reconciliations
LANGUAGE plpgsql
AS $function$
DECLARE
  v_rec public.agent_cash_reconciliations;
  v_org_id UUID;
  v_cash_account public.ledger_accounts;
  v_suspense public.ledger_accounts;
  v_short NUMERIC(24,2);
  v_lines JSONB;
BEGIN
  IF p_resolution NOT IN ('RECOVERED_TO_TILL', 'WRITTEN_OFF',
                          'DOCUMENTED_AS_MISSED_TRANSACTION', 'RETURNED_TO_SENDER', 'FORFEITED_TO_INCOME') THEN
    RAISE EXCEPTION 'INVALID_RESOLUTION_%', p_resolution;
  END IF;
  IF p_posted_by IS NULL OR length(trim(p_posted_by)) = 0 THEN
    RAISE EXCEPTION 'RESOLUTION_ACTOR_REQUIRED';
  END IF;

  SELECT * INTO v_rec FROM public.agent_cash_reconciliations WHERE id = p_reconciliation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RECONCILIATION_NOT_FOUND';
  END IF;
  IF v_rec.status NOT IN ('VARIANCE_JOURNALED', 'OVERAGE_PENDING_REVIEW') THEN
    RAISE EXCEPTION 'RECONCILIATION_NOT_RESOLVABLE_STATUS_%', v_rec.status;
  END IF;

  SELECT la.* INTO v_cash_account
  FROM public.agent_float_accounts afa
  JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
  WHERE afa.agent_id = v_rec.agent_id AND afa.account_kind = 'CASH_IN_HAND' AND afa.currency = v_rec.currency;
  v_org_id := v_cash_account.org_id;
  SELECT * INTO v_suspense FROM public.ledger_accounts
  WHERE account_number = 'SUSPENSE-' || v_rec.currency AND currency = v_rec.currency;

  IF v_rec.status = 'VARIANCE_JOURNALED' THEN
    -- Shortfall resolutions
    v_short := -v_rec.difference; -- positive
    IF p_resolution NOT IN ('RECOVERED_TO_TILL', 'WRITTEN_OFF') THEN
      RAISE EXCEPTION 'INVALID_RESOLUTION_FOR_SHORTFALL_%', p_resolution;
    END IF;

    IF p_resolution = 'RECOVERED_TO_TILL' THEN
      -- The cash was found / the count was corrected: reverse the variance
      -- journal — the agent's position is restored and the suspense clears.
      v_lines := jsonb_build_array(
        jsonb_build_object('account_number', v_cash_account.account_number, 'entry_type', 'CREDIT', 'amount', v_short,
                           'narration', 'Cash variance resolved: shortfall restored to till (recount/recovery)'),
        jsonb_build_object('account_number', v_suspense.account_number, 'entry_type', 'DEBIT', 'amount', v_short,
                           'narration', 'Cash variance resolved: suspense claim cleared on recovery')
      );
    ELSE
      -- WRITTEN_OFF: the missing value is a recognised operational loss.
      INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
      VALUES (v_org_id, 'OPERATIONAL-LOSS-' || v_rec.currency, 'Operational Loss — ' || v_rec.currency, 'EXPENSE', v_rec.currency,
              (SELECT country FROM public.organizations WHERE id = v_org_id), 0.00)
      ON CONFLICT (account_number) DO NOTHING;
      v_lines := jsonb_build_array(
        jsonb_build_object('account_number', v_suspense.account_number, 'entry_type', 'DEBIT', 'amount', v_short,
                           'narration', 'Cash variance written off: suspense claim cleared'),
        jsonb_build_object('account_number', 'OPERATIONAL-LOSS-' || v_rec.currency, 'entry_type', 'CREDIT', 'amount', v_short,
                           'narration', 'Cash shortfall recognised as operational loss (reconciliation ' || v_rec.id::text || ')')
      );
    END IF;
  ELSE
    -- Overage resolutions (no ledger value was created at count time)
    IF p_resolution NOT IN ('DOCUMENTED_AS_MISSED_TRANSACTION', 'RETURNED_TO_SENDER', 'FORFEITED_TO_INCOME') THEN
      RAISE EXCEPTION 'INVALID_RESOLUTION_FOR_OVERAGE_%', p_resolution;
    END IF;

    IF p_resolution = 'FORFEITED_TO_INCOME' THEN
      -- The overage physically leaves the till into company custody and is
      -- recognised as miscellaneous income (agent position reduced by the
      -- amount they no longer hold for anyone).
      INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
      VALUES (v_org_id, 'MISC-INCOME-' || v_rec.currency, 'Miscellaneous Income — ' || v_rec.currency, 'REVENUE', v_rec.currency,
              (SELECT country FROM public.organizations WHERE id = v_org_id), 0.00)
      ON CONFLICT (account_number) DO NOTHING;
      v_lines := jsonb_build_array(
        jsonb_build_object('account_number', v_cash_account.account_number, 'entry_type', 'DEBIT', 'amount', v_rec.difference,
                           'narration', 'Overage forfeited: excess cash handed to company custody'),
        jsonb_build_object('account_number', 'MISC-INCOME-' || v_rec.currency, 'entry_type', 'CREDIT', 'amount', v_rec.difference,
                           'narration', 'Miscellaneous income: unclaimed overage (reconciliation ' || v_rec.id::text || ')')
      );
    END IF;
    -- DOCUMENTED_AS_MISSED_TRANSACTION and RETURNED_TO_SENDER have no ledger
    -- impact: no value was ever created, and the missed-transaction booking
    -- (if any) posts through its own sanctioned path.
  END IF;

  IF v_lines IS NOT NULL THEN
    PERFORM public.post_adjustment_journal(
      v_org_id, v_rec.currency,
      'CASHVAR-RES-' || UPPER(SUBSTRING(v_rec.id::text, 1, 12)),
      'Cash reconciliation variance resolution (' || p_resolution || '): agent ' || v_rec.agent_id::text ||
        ', date ' || v_rec.reconciliation_date::text || ', difference ' || v_rec.currency || ' ' || v_rec.difference::text ||
        '. ' || COALESCE(p_notes, ''),
      p_posted_by,
      v_lines
    );
  END IF;

  UPDATE public.agent_cash_reconciliations
  SET status = 'RESOLVED', resolution = p_resolution, resolution_notes = p_notes,
      resolved_at = NOW(), resolved_by = p_posted_by
  WHERE id = v_rec.id
  RETURNING * INTO v_rec;

  RETURN v_rec;
END;
$function$;

-- =============================================================================
-- S4. run_daily_financial_close v2 — reconciliation & suspense metrics
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
    AND NOT EXISTS (SELECT 1 FROM public.customer_transactions c WHERE c.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.agency_transactions a WHERE a.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.merchant_payment_transactions m WHERE m.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.agent_float_topup_requests f WHERE f.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.settlement_batch_lines s WHERE s.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM public.merchant_settlement_batches b WHERE b.ledger_transaction_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM adashi.payouts p WHERE p.ledger_journal_id = t.id::text)
    AND NOT EXISTS (SELECT 1 FROM adashi.contribution_obligations o WHERE o.ledger_journal_id = t.id::text)
    AND NOT EXISTS (SELECT 1 FROM public.agent_cash_reconciliations r WHERE r.ledger_transaction_id = t.id);

  -- ---- New: reconciliation & suspense (§16) ----
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
