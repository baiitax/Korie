-- =============================================================================
-- 20260914000057_fx_revaluation.sql
--
-- FX revaluation, unrealized FX P&L accounts and per-currency position
-- reporting (assessment F20 / backlog B7 part 2): "No revaluation, no
-- realized/unrealized FX P&L accounts, no per-currency position reporting.
-- The FX books net to 0 only because test swaps were reversed."
--
--   S1  Unrealized-FX P&L accounts in the base currency (NGN): gain
--       (REVENUE), loss (EXPENSE) and the revaluation reserve (EQUITY) that
--       carries the cumulative unrealized position. Created by the same
--       string-convention every other live account uses.
--   S2  fx_revaluations: append-only mark table, one row per
--       (valuation_date, position_currency). RLS on, no anon writes.
--       Perimeter hardening for the finance function family: EXECUTE is
--       revoked from anon/authenticated (all application callers use the
--       service-role admin client; the repo's own verify-rls gate requires
--       exactly this), and fx_rate_history (created in 000053 without it)
--       finally gets RLS.
--   S3  run_fx_revaluation(p_valuation_date, p_run_by): for every foreign-
--       currency FX-BOOK position (base = NGN, the functional currency of
--       the NG-registered platform):
--         - zero position            -> nothing written (nothing to mark)
--         - no governed rate         -> skipped and reported, never guessed
--         - first ever mark          -> BASELINE row at the current governed
--                                       rate, zero P&L — an opening mark
--                                       must not invent a gain
--         - rate unchanged           -> MARKED_NO_CHANGE row, no journal
--         - rate moved               -> POSTED: unrealized gain/loss journal
--                                       through the sanctioned
--                                       post_adjustment_journal path
--                                       (FXREVAL-<date>-<ccy> reference,
--                                       attributed, reason, audited)
--       One mark per date+currency: re-running a marked date is a reported
--       no-op (marks are EOD; an intraday re-rate is caught by the next
--       mark, and the daily close flags the stale mark in between — honest,
--       never silent).
--   S4  generate_fx_position_report(): per-currency desk position from the
--       FX-BOOK ledger accounts — units, current governed rate + provenance,
--       NGN market value, cumulative unrealized P&L, last mark, and a
--       stale_mark flag.
--   S5  run_daily_financial_close v5 (signature unchanged; all v4 exception
--       logic preserved verbatim): FXREVAL journals are not orphans; three
--       new metrics (fx_positions snapshot, fx_reval_integrity_violations,
--       fx_stale_revaluation_marks); integrity violations (ledger vs mark
--       table disagreement) and stale marks on live positions count as close
--       exceptions.
--
-- Honest limits (documented, deliberate):
--   - Mark-to-market is EOD on net position: delta = units_today x
--     (rate_today - rate_at_last_mark). Inventory flows between marks are
--     assumed to enter at the last-marked rate; an exact realized/unrealized
--     split needs per-lot cost basis, which post_customer_fx_swap does not
--     record (future work with swap-level cost tracking).
--   - The base currency is NGN. Only foreign-currency books are revalued.
--   - A deliberate forward/reverse spread remains unsupported by design
--     (H.9): pairs stay reciprocal by construction.
--
-- No existing function signature changes.
-- =============================================================================

-- =============================================================================
-- S1. Unrealized FX P&L accounts (base currency NGN, NG entity)
-- =============================================================================

INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance, status)
SELECT a.org_id, 'FX-UNREALIZED-GAIN-NGN', 'Unrealized FX revaluation gain (base NGN)', 'REVENUE', 'NGN', 'NG', 0, 'ACTIVE'
FROM public.ledger_accounts a
WHERE a.account_number = 'FX-REVENUE-NGN'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance, status)
SELECT a.org_id, 'FX-UNREALIZED-LOSS-NGN', 'Unrealized FX revaluation loss (base NGN)', 'EXPENSE', 'NGN', 'NG', 0, 'ACTIVE'
FROM public.ledger_accounts a
WHERE a.account_number = 'FX-REVENUE-NGN'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance, status)
SELECT a.org_id, 'FX-REVAL-RESERVE-NGN', 'Cumulative unrealized FX revaluation reserve (base NGN)', 'EQUITY', 'NGN', 'NG', 0, 'ACTIVE'
FROM public.ledger_accounts a
WHERE a.account_number = 'FX-REVENUE-NGN'
ON CONFLICT (account_number) DO NOTHING;

-- =============================================================================
-- S2. Mark table + perimeter
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.fx_revaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_date DATE NOT NULL,
  position_currency CHARACTER VARYING(3) NOT NULL,
  base_currency CHARACTER VARYING(3) NOT NULL DEFAULT 'NGN',
  position_units NUMERIC(24,2) NOT NULL,
  rate_used NUMERIC(18,8) NOT NULL,
  rate_source CHARACTER VARYING,
  market_value_base NUMERIC(24,2) NOT NULL,
  prior_rate_used NUMERIC(18,8),          -- NULL on the BASELINE mark (opening basis)
  unrealized_gain_loss NUMERIC(24,2) NOT NULL DEFAULT 0,
  status CHARACTER VARYING(24) NOT NULL
    CHECK (status IN ('BASELINE', 'POSTED', 'MARKED_NO_CHANGE')),
  ledger_transaction_id UUID REFERENCES public.ledger_transactions(id),
  run_by CHARACTER VARYING NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (valuation_date, position_currency)
);

CREATE INDEX IF NOT EXISTS idx_fx_revaluations_ccy_date
  ON public.fx_revaluations (position_currency, valuation_date DESC);

ALTER TABLE public.fx_revaluations ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.fx_revaluations FROM anon;

-- fx_rate_history (000053) predates the perimeter discipline: no RLS and
-- full anon grants. Close the gap — the admin routes read it through the
-- service-role client, so nothing legitimate is affected.
ALTER TABLE public.fx_rate_history ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.fx_rate_history FROM anon;

-- =============================================================================
-- S3. The revaluation runner
-- =============================================================================

CREATE OR REPLACE FUNCTION public.run_fx_revaluation(
  p_valuation_date date DEFAULT CURRENT_DATE,
  p_run_by character varying DEFAULT 'system')
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_base CONSTANT VARCHAR(3) := 'NGN';   -- functional currency of the NG reporting entity
  v_org UUID;
  v_units NUMERIC(24,2);
  v_rate NUMERIC(18,8);
  v_rate_source VARCHAR;
  v_market NUMERIC(24,2);
  v_prior_rate NUMERIC(18,8);
  v_delta NUMERIC(24,2);
  v_status VARCHAR(24);
  v_ref VARCHAR;
  v_reason TEXT;
  v_lines JSONB;
  v_tx public.ledger_transactions;
  r RECORD;
  v_checked INT := 0;
  v_baseline INT := 0;
  v_posted INT := 0;
  v_nochange INT := 0;
  v_zero INT := 0;
  v_already INT := 0;
  v_norate TEXT[] := '{}';
  v_total NUMERIC(24,2) := 0;
BEGIN
  SELECT org_id INTO v_org FROM public.ledger_accounts WHERE account_number = 'FX-REVAL-RESERVE-NGN' LIMIT 1;

  FOR r IN
    SELECT la.currency AS ccy, SUM(la.balance) AS units
    FROM public.ledger_accounts la
    WHERE la.account_number LIKE 'FX-BOOK-%'
      AND la.status = 'ACTIVE'
      AND la.currency <> v_base
    GROUP BY la.currency
  LOOP
    v_checked := v_checked + 1;
    v_units := r.units;

    IF v_units = 0 THEN
      v_zero := v_zero + 1;
      CONTINUE; -- nothing held, nothing to mark
    END IF;

    SELECT fr.rate, fr.source INTO v_rate, v_rate_source
    FROM public.fx_rates fr
    WHERE fr.source_currency = r.ccy AND fr.destination_currency = v_base;
    IF NOT FOUND THEN
      v_norate := array_append(v_norate, r.ccy);
      CONTINUE; -- no governed rate -> refuse to guess a mark
    END IF;

    IF EXISTS (SELECT 1 FROM public.fx_revaluations x
               WHERE x.valuation_date = p_valuation_date AND x.position_currency = r.ccy) THEN
      v_already := v_already + 1;
      CONTINUE; -- one EOD mark per date+currency, never rewritten
    END IF;

    v_market := ROUND(v_units * v_rate, 2);

    SELECT x.rate_used INTO v_prior_rate
    FROM public.fx_revaluations x
    WHERE x.position_currency = r.ccy AND x.valuation_date < p_valuation_date
    ORDER BY x.valuation_date DESC, x.created_at DESC
    LIMIT 1;

    IF v_prior_rate IS NULL THEN
      v_status := 'BASELINE';
      v_delta := 0; -- opening mark at the current rate: no gain invented at inception
    ELSE
      v_delta := ROUND(v_units * (v_rate - v_prior_rate), 2);
      v_status := CASE WHEN v_delta = 0 THEN 'MARKED_NO_CHANGE' ELSE 'POSTED' END;
    END IF;

    IF v_status = 'POSTED' THEN
      v_ref := 'FXREVAL-' || to_char(p_valuation_date, 'YYYY-MM-DD') || '-' || r.ccy;
      IF EXISTS (SELECT 1 FROM public.ledger_transactions t WHERE t.transaction_reference = v_ref) THEN
        v_ref := v_ref || '-R' || ((SELECT count(*) FROM public.ledger_transactions t WHERE t.transaction_reference LIKE v_ref || '%') + 1)::text;
      END IF;
      v_reason := 'FX revaluation mark ' || to_char(p_valuation_date, 'YYYY-MM-DD') || ' for ' || r.ccy ||
                  ' position ' || v_units || ' at governed rate ' || v_rate ||
                  ' (source ' || COALESCE(v_rate_source, 'unattributed') || '): unrealized ' ||
                  CASE WHEN v_delta > 0 THEN 'gain ' ELSE 'loss ' END || abs(v_delta) || ' ' || v_base;
      IF v_delta > 0 THEN
        v_lines := jsonb_build_array(
          jsonb_build_object('account_number', 'FX-REVAL-RESERVE-NGN',   'entry_type', 'DEBIT',  'amount', v_delta),
          jsonb_build_object('account_number', 'FX-UNREALIZED-GAIN-NGN', 'entry_type', 'CREDIT', 'amount', v_delta));
      ELSE
        v_lines := jsonb_build_array(
          jsonb_build_object('account_number', 'FX-UNREALIZED-LOSS-NGN', 'entry_type', 'DEBIT',  'amount', abs(v_delta)),
          jsonb_build_object('account_number', 'FX-REVAL-RESERVE-NGN',   'entry_type', 'CREDIT', 'amount', abs(v_delta)));
      END IF;

      SELECT * INTO v_tx FROM public.post_adjustment_journal(v_org, v_base, v_ref, v_reason, p_run_by, v_lines);
      v_posted := v_posted + 1;
      v_total := v_total + v_delta;
    ELSIF v_status = 'BASELINE' THEN
      v_baseline := v_baseline + 1;
    ELSE
      v_nochange := v_nochange + 1;
    END IF;

    INSERT INTO public.fx_revaluations (
      valuation_date, position_currency, base_currency, position_units,
      rate_used, rate_source, market_value_base, prior_rate_used,
      unrealized_gain_loss, status, ledger_transaction_id, run_by
    ) VALUES (
      p_valuation_date, r.ccy, v_base, v_units,
      v_rate, v_rate_source, v_market, v_prior_rate,
      v_delta, v_status, CASE WHEN v_status = 'POSTED' THEN v_tx.id ELSE NULL END, p_run_by
    );
  END LOOP;

  INSERT INTO public.audit_events (org_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (
    v_org,
    '00000000-0000-4000-8000-000000000001',
    'system@koriepay.internal',
    'SYSTEM',
    'FX_REVALUATION_RUN',
    'fx_revaluations',
    p_valuation_date::text,
    jsonb_build_object('valuation_date', p_valuation_date, 'run_by', p_run_by,
                       'positions_checked', v_checked, 'baselines', v_baseline, 'marks_posted', v_posted,
                       'marks_no_change', v_nochange, 'skipped_zero_position', v_zero,
                       'skipped_already_marked', v_already, 'skipped_no_rate', to_jsonb(v_norate),
                       'total_unrealized_gain_loss', v_total),
    'db-function',
    'FXREVAL-' || p_valuation_date::text,
    'FXREVAL-' || p_valuation_date::text
  );

  RETURN jsonb_build_object(
    'valuation_date', p_valuation_date,
    'base_currency', v_base,
    'positions_checked', v_checked,
    'baselines', v_baseline,
    'marks_posted', v_posted,
    'marks_no_change', v_nochange,
    'skipped_zero_position', v_zero,
    'skipped_already_marked', v_already,
    'skipped_no_rate', to_jsonb(v_norate),
    'total_unrealized_gain_loss', v_total
  );
END;
$function$;

-- =============================================================================
-- S4. Position report (the desk's ledger-true FX position)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_fx_position_report()
RETURNS TABLE (
  currency CHARACTER VARYING(3),
  is_base BOOLEAN,
  book_accounts TEXT,
  position_units NUMERIC,
  current_rate NUMERIC,
  rate_source CHARACTER VARYING,
  rate_updated_at TIMESTAMPTZ,
  market_value_base NUMERIC,
  last_valuation_date DATE,
  last_rate_used NUMERIC,
  cumulative_unrealized NUMERIC,
  stale_mark BOOLEAN)
LANGUAGE sql STABLE
AS $function$
  SELECT
    la.currency,
    la.currency = 'NGN',
    string_agg(DISTINCT la.account_number, ', '),
    SUM(la.balance),
    fr.rate,
    fr.source,
    fr.updated_at,
    ROUND(SUM(la.balance) * COALESCE(fr.rate, 1), 2),
    (SELECT x.valuation_date FROM public.fx_revaluations x
      WHERE x.position_currency = la.currency
      ORDER BY x.valuation_date DESC, x.created_at DESC LIMIT 1),
    (SELECT x.rate_used FROM public.fx_revaluations x
      WHERE x.position_currency = la.currency
      ORDER BY x.valuation_date DESC, x.created_at DESC LIMIT 1),
    (SELECT COALESCE(SUM(x.unrealized_gain_loss), 0) FROM public.fx_revaluations x
      WHERE x.position_currency = la.currency AND x.status = 'POSTED'),
    la.currency <> 'NGN'
      AND SUM(la.balance) <> 0
      AND (fr.rate IS NULL
           OR NOT EXISTS (SELECT 1 FROM public.fx_revaluations x WHERE x.position_currency = la.currency)
           OR (SELECT x.rate_used FROM public.fx_revaluations x
                WHERE x.position_currency = la.currency
                ORDER BY x.valuation_date DESC, x.created_at DESC LIMIT 1) <> fr.rate)
  FROM public.ledger_accounts la
  LEFT JOIN public.fx_rates fr
    ON fr.source_currency = la.currency AND fr.destination_currency = 'NGN'
  WHERE la.account_number LIKE 'FX-BOOK-%' AND la.status = 'ACTIVE'
  GROUP BY la.currency, fr.rate, fr.source, fr.updated_at;
$function$;

-- =============================================================================
-- S5. Daily close v5 — FX revaluation exceptions (v4 logic preserved verbatim)
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
               + v_fx_stale;

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
      'fx_stale_revaluation_marks', v_fx_stale
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
-- S6. Perimeter: the finance function family follows the same posture the
-- codebase already uses for run_daily_settlement / post_customer_fx_swap --
-- EXECUTE revoked from PUBLIC and granted explicitly to service_role only.
-- Every application caller (admin / compliance / cron / ops routes) goes
-- through the service-role admin client; scripts/verify-rls.mjs requires
-- exactly this posture. The broader sweep over pre-existing engine
-- functions belongs to the security stream; this migration covers the
-- finance domain it touches.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.run_fx_revaluation(date, character varying) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_fx_revaluation(date, character varying) TO service_role;
REVOKE EXECUTE ON FUNCTION public.generate_fx_position_report() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_fx_position_report() TO service_role;
REVOKE EXECUTE ON FUNCTION public.run_daily_financial_close(date, character varying) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_daily_financial_close(date, character varying) TO service_role;
REVOKE EXECUTE ON FUNCTION public.run_aggregator_reconciliation(date, character varying) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_aggregator_reconciliation(date, character varying) TO service_role;
REVOKE EXECUTE ON FUNCTION public.update_fx_rate_pair(character varying, character varying, numeric, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_fx_rate_pair(character varying, character varying, numeric, uuid, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.post_adjustment_journal(uuid, character varying, character varying, text, character varying, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_adjustment_journal(uuid, character varying, character varying, text, character varying, jsonb) TO service_role;
REVOKE EXECUTE ON FUNCTION public.generate_trial_balance(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_trial_balance(uuid, date) TO service_role;
-- These two additionally carried EXPLICIT anon/authenticated grants from
-- the original platform layer; those roles are revoked directly as well.
REVOKE EXECUTE ON FUNCTION public.reverse_agency_transaction(uuid, character varying, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_agency_transaction(uuid, character varying, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.post_funding_journal(uuid, character varying, character varying, text, character varying, character varying, character varying, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_funding_journal(uuid, character varying, character varying, text, character varying, character varying, character varying, numeric) TO service_role;
