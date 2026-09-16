-- =============================================================================
-- Month-End Close Checklist (60-day plan: "bank rec, liability rec, revenue
-- rec, commission rec, suspense review — executed manually for two cycles")
--
-- This migration turns the manual checklist into an auditable workflow:
--   month_end_close_checklists  one row per (year, month, is_drill)
--   month_end_close_items       the five reconciliations, each with a REAL
--                               computed result (no invented figures)
--   open_month_end_close()      create/idempotent-get the checklist + items
--   run_month_end_close_item()  compute one reconciliation from production
--                               data and record it (idempotent, re-runnable)
--   prepare_month_end_close()   the maker step: all five items PERFORMED,
--                               daily-close coverage for every activity day,
--                               trial balance consistent -> PREPARED
--   review_month_end_close()    the checker step: a DIFFERENT person reviews;
--                               APPROVE -> CLOSED (period close of record),
--                               REJECT -> back to OPEN. Four-eyes is enforced
--                               by email comparison, mirroring B8.
--
-- A drill (is_drill = true) runs the identical computations mid-month and is
-- labelled as a drill everywhere; it exists so the workflow can be exercised
-- and evidenced before a real month-end. Real (non-drill) closes refuse to
-- prepare before the month is complete, and refuse to prepare while activity
-- days are missing their daily close.
--
-- Honest scope, stated in the results themselves:
--   BANK_REC prepares the INTERNAL side only — external statement matching is
--   B4-blocked and every result says so explicitly. Nothing is fabricated.
-- =============================================================================

BEGIN;

-- =============================================================================
-- S1. Tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.month_end_close_checklists (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year   integer      NOT NULL,
  period_month  integer      NOT NULL,
  is_drill      boolean      NOT NULL DEFAULT false,
  status        varchar(16)  NOT NULL DEFAULT 'OPEN',
  prepared_by   varchar(128),
  prepared_at   timestamptz,
  prepare_summary jsonb,
  reviewed_by   varchar(128),
  reviewed_at   timestamptz,
  review_notes  text,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT month_end_close_checklists_period_key UNIQUE (period_year, period_month, is_drill),
  CONSTRAINT month_end_close_checklists_status_check CHECK (status IN ('OPEN','PREPARED','CLOSED')),
  CONSTRAINT month_end_close_checklists_year_check CHECK (period_year BETWEEN 2020 AND 2100),
  CONSTRAINT month_end_close_checklists_month_check CHECK (period_month BETWEEN 1 AND 12)
);

COMMENT ON TABLE public.month_end_close_checklists IS 'Month-end close of record per (year, month). A drill row (is_drill) exercises the identical workflow mid-month and is labelled as such — it is never a period close of record.';

CREATE TABLE IF NOT EXISTS public.month_end_close_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id  uuid NOT NULL REFERENCES public.month_end_close_checklists(id) ON DELETE CASCADE,
  item_key      varchar(32) NOT NULL,
  title         varchar(160) NOT NULL,
  status        varchar(16) NOT NULL DEFAULT 'PENDING',
  result        jsonb,
  performed_by  varchar(128),
  performed_at  timestamptz,
  notes         text,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT month_end_close_items_unique UNIQUE (checklist_id, item_key),
  CONSTRAINT month_end_close_items_key_check CHECK (item_key IN ('BANK_REC','LIABILITY_REC','REVENUE_REC','COMMISSION_REC','SUSPENSE_REVIEW')),
  CONSTRAINT month_end_close_items_status_check CHECK (status IN ('PENDING','PERFORMED','EXCEPTION'))
);

COMMENT ON TABLE public.month_end_close_items IS 'The five month-end reconciliations. Each result is computed from production tables by run_month_end_close_item — never hand-entered. EXCEPTION means a real tie-out break that must be remediated before the month can be prepared.';

ALTER TABLE public.month_end_close_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.month_end_close_items ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- S2. open_month_end_close — idempotent creation of the checklist + items
-- =============================================================================

CREATE OR REPLACE FUNCTION public.open_month_end_close(
  p_year integer,
  p_month integer,
  p_is_drill boolean DEFAULT false,
  p_opened_by varchar(128) DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_year IS NULL OR p_month IS NULL OR p_year < 2020 OR p_year > 2100 OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_INVALID_PERIOD';
  END IF;

  INSERT INTO public.month_end_close_checklists (period_year, period_month, is_drill)
  VALUES (p_year, p_month, COALESCE(p_is_drill, false))
  ON CONFLICT (period_year, period_month, is_drill) DO NOTHING;

  SELECT id INTO v_id FROM public.month_end_close_checklists
  WHERE period_year = p_year AND period_month = p_month AND is_drill = COALESCE(p_is_drill, false);

  INSERT INTO public.month_end_close_items (checklist_id, item_key, title)
  VALUES
    (v_id, 'BANK_REC',        'Bank reconciliation — internal side prepared, external statements pending (B4)'),
    (v_id, 'LIABILITY_REC',   'Liability reconciliation — customer wallets, merchant settlement, Adashi escrow'),
    (v_id, 'REVENUE_REC',     'Revenue reconciliation — every fee stream vs journals'),
    (v_id, 'COMMISSION_REC',  'Commission reconciliation — payable & expense vs commission sub-ledger'),
    (v_id, 'SUSPENSE_REVIEW', 'Suspense review — balances and aging')
  ON CONFLICT (checklist_id, item_key) DO NOTHING;

  RETURN v_id;
END;
$function$;

-- =============================================================================
-- S3. run_month_end_close_item — compute ONE reconciliation, for real
-- =============================================================================

CREATE OR REPLACE FUNCTION public.run_month_end_close_item(
  p_year integer,
  p_month integer,
  p_item_key varchar(32),
  p_is_drill boolean DEFAULT false,
  p_performed_by varchar(128) DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_id uuid;
  v_start date := make_date(p_year, p_month, 1);
  v_end date := (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::date;
  v_next date := v_end + 1;
  v_result jsonb;
  v_item_status varchar(16);
  v_actor uuid;
  v_wallet_mismatches integer;
  v_wallet_delta numeric;
  v_other_net numeric;
  v_adashi_delta numeric;
  v_rev_delta numeric;
  v_comm_delta numeric;
  v_suspense_nonzero integer;
BEGIN
  IF p_item_key NOT IN ('BANK_REC','LIABILITY_REC','REVENUE_REC','COMMISSION_REC','SUSPENSE_REVIEW') THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_INVALID_ITEM';
  END IF;
  IF p_performed_by IS NULL OR length(trim(p_performed_by)) < 3 THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_ACTOR_REQUIRED';
  END IF;
  -- audit_events.actor_id is NOT NULL: resolve the real user_profiles row for
  -- the acting email. The admin/ops routes authenticate against the same
  -- table, so a profile always exists for a real actor.
  SELECT id INTO v_actor FROM public.user_profiles WHERE lower(email) = lower(trim(p_performed_by)) LIMIT 1;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_ACTOR_PROFILE_REQUIRED';
  END IF;

  v_id := public.open_month_end_close(p_year, p_month, p_is_drill, p_performed_by);

  IF (SELECT status FROM public.month_end_close_checklists WHERE id = v_id) <> 'OPEN' THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_ALREADY_DECIDED';
  END IF;

  ------------------------------------------------------------------ BANK_REC
  -- Internal side of the bank reconciliation: every account that represents
  -- money pending at an external rail (clearing, payout clearing, acquiring
  -- receivable, treasury funding) with its balance, period movement and idle
  -- age. The external side (statements) is B4-blocked and the result says so.
  IF p_item_key = 'BANK_REC' THEN
    SELECT jsonb_build_object(
      'internal_side', COALESCE(jsonb_agg(jsonb_build_object(
        'account', a.account_number,
        'currency', a.currency,
        'account_type', a.type,
        'balance', a.balance,
        'period_movement', COALESCE(m.net, 0),
        'last_movement', m.last_at,
        'days_idle', CASE WHEN m.last_at IS NULL THEN NULL ELSE (CURRENT_DATE - m.last_at::date) END
      ) ORDER BY a.account_number), '[]'::jsonb),
      'external_statements', 'NOT_INGESTED',
      'external_note', 'Bank statement ingestion is B4-blocked. The internal side is fully computed above; the external match will be added when statements exist. Nothing here is fabricated.'
    ) INTO v_result
    FROM public.ledger_accounts a
    LEFT JOIN LATERAL (
      SELECT sum(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END) AS net,
             max(e.created_at) AS last_at
      FROM public.ledger_entries e
      WHERE e.account_id = a.id
        AND e.created_at >= v_start AND e.created_at < v_next
    ) m ON true
    WHERE a.account_number ~ '^(CLEARING-|MERCHANT-PAYOUT-CLEARING-|MERCHANT-ACQUIRING-RECEIVABLE-|TREASURY-FUNDING-)';

    v_item_status := 'PERFORMED';

  --------------------------------------------------------------- LIABILITY_REC
  -- (a) Customer wallets: every wallet's ledger account balance must equal
  --     the wallets table balance (the customer-facing sub-ledger).
  -- (b) Merchant settlement: per-merchant movement attribution — every
  --     movement on MER-SETL-* is attributed structurally (collection /
  --     settlement batch / payout request / treasury funding) and anything
  --     unattributed is LISTED for the reviewer.
  -- (c) Adashi escrow: balance vs paid obligations minus successful payouts.
  ELSIF p_item_key = 'LIABILITY_REC' THEN
    -- (a) wallets
    SELECT count(*) FILTER (WHERE wt.delta <> 0), COALESCE(sum(wt.delta), 0)
    INTO v_wallet_mismatches, v_wallet_delta
    FROM (
      SELECT a.balance - w.balance AS delta
      FROM public.wallets w
      JOIN public.ledger_accounts a ON a.id = w.ledger_account_id
    ) wt;

    -- (b) merchant settlement accounts: attribute every movement on every
    -- MER-SETL account to its structural source; anything unattributed is
    -- listed for the reviewer.
    CREATE TEMP TABLE IF NOT EXISTS _mec_mer_movements ON COMMIT DROP AS
    SELECT a.account_number, t.id AS txn_id, t.transaction_reference AS ref, t.created_at::date AS dte,
           sum(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END) AS net,
           CASE
             WHEN EXISTS (SELECT 1 FROM public.merchant_payment_transactions mpt WHERE mpt.ledger_transaction_id = t.id) THEN 'COLLECTIONS'
             WHEN EXISTS (SELECT 1 FROM public.merchant_settlement_batches msb WHERE msb.ledger_transaction_id = t.id) THEN 'SETTLEMENT_BATCHES'
             WHEN EXISTS (SELECT 1 FROM public.merchant_payout_requests mpr WHERE mpr.ledger_transaction_id = t.id OR mpr.reversal_ledger_transaction_id = t.id) THEN 'PAYOUT_REQUESTS'
             WHEN EXISTS (SELECT 1 FROM public.ledger_entries e2 JOIN public.ledger_accounts a2 ON a2.id = e2.account_id
                          WHERE e2.transaction_id = t.id AND a2.id <> a.id AND a2.account_number LIKE 'TREASURY-%') THEN 'TREASURY_FUNDING'
             ELSE 'OTHER'
           END AS src
    FROM public.ledger_entries e
    JOIN public.ledger_accounts a ON a.id = e.account_id
    JOIN public.ledger_transactions t ON t.id = e.transaction_id
    WHERE a.account_number LIKE 'MER-SETL-%'
      AND e.created_at >= v_start AND e.created_at < v_next
    GROUP BY a.account_number, a.id, t.id, t.transaction_reference, t.created_at;

    SELECT COALESCE(sum(o.net), 0) INTO v_other_net
    FROM _mec_mer_movements o
    WHERE o.src = 'OTHER';

    -- (c) adashi escrow tie-out, per currency
    SELECT COALESCE(sum(d.delta), 0) INTO v_adashi_delta
    FROM (
      SELECT a.balance
        - (SELECT COALESCE(sum(o.amount), 0) FROM adashi.contribution_obligations o WHERE o.status = 'PAID' AND o.ledger_journal_id IS NOT NULL AND o.currency = a.currency)
        + (SELECT COALESCE(sum(p.gross_amount), 0) FROM adashi.payouts p WHERE p.status = 'SUCCESS' AND p.currency = a.currency) AS delta
      FROM public.ledger_accounts a
      WHERE a.account_number LIKE 'ADASHI-ESCROW-%'
    ) d;

    SELECT jsonb_build_object(
      'customer_wallets', jsonb_build_object(
        'wallet_count', (SELECT count(*) FROM public.wallets),
        'mismatches', v_wallet_mismatches,
        'total_delta', v_wallet_delta,
        'per_currency', COALESCE((SELECT jsonb_object_agg(currency, total) FROM (
            SELECT a.currency, sum(a.balance) AS total FROM public.wallets w JOIN public.ledger_accounts a ON a.id = w.ledger_account_id GROUP BY a.currency
          ) c), '{}'::jsonb)
      ),
      'merchant_settlement', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'account', ma.account_number,
          'currency', ma.currency,
          'opening_balance', COALESCE(op.net, 0),
          'closing_balance', ma.balance,
          'movements', COALESCE(mv.by_source, '{}'::jsonb),
          'unattributed_movements', COALESCE(mv.other_list, '[]'::jsonb)
        ) ORDER BY ma.account_number)
        FROM public.ledger_accounts ma
        LEFT JOIN LATERAL (
          SELECT sum(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END) AS net
          FROM public.ledger_entries e WHERE e.account_id = ma.id AND e.created_at < v_start
        ) op ON true
        LEFT JOIN LATERAL (
          SELECT (SELECT jsonb_object_agg(src, net) FROM (SELECT src, sum(net) AS net FROM _mec_mer_movements WHERE account_number = ma.account_number GROUP BY src) y) AS by_source,
                 (SELECT jsonb_agg(jsonb_build_object('reference', ref, 'net', net, 'date', dte) ORDER BY dte) FROM _mec_mer_movements WHERE account_number = ma.account_number AND src = 'OTHER') AS other_list
        ) mv ON true
        WHERE ma.account_number LIKE 'MER-SETL-%'), '[]'::jsonb),
      'merchant_settlement_unattributed_net', v_other_net,
      'adashi_escrow', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'account', a.account_number,
          'balance', a.balance,
          'paid_obligations', (SELECT COALESCE(sum(o.amount), 0) FROM adashi.contribution_obligations o WHERE o.status = 'PAID' AND o.ledger_journal_id IS NOT NULL AND o.currency = a.currency),
          'successful_payouts', (SELECT COALESCE(sum(p.gross_amount), 0) FROM adashi.payouts p WHERE p.status = 'SUCCESS' AND p.currency = a.currency),
          'delta', a.balance
            - (SELECT COALESCE(sum(o.amount), 0) FROM adashi.contribution_obligations o WHERE o.status = 'PAID' AND o.ledger_journal_id IS NOT NULL AND o.currency = a.currency)
            + (SELECT COALESCE(sum(p.gross_amount), 0) FROM adashi.payouts p WHERE p.status = 'SUCCESS' AND p.currency = a.currency)
        ) ORDER BY a.account_number)
        FROM public.ledger_accounts a WHERE a.account_number LIKE 'ADASHI-ESCROW-%'), '[]'::jsonb),
      'other_liability_positions', COALESCE((SELECT jsonb_agg(jsonb_build_object('account', a.account_number, 'balance', a.balance) ORDER BY a.account_number)
        FROM public.ledger_accounts a WHERE a.type = 'LIABILITY' AND a.account_number ~ '^(ADASHI-AGENT-COMMISSION|FX-BOOK)'), '[]'::jsonb)
    ) INTO v_result;

    v_item_status := CASE WHEN v_wallet_mismatches > 0 OR v_other_net <> 0 OR v_adashi_delta <> 0 THEN 'EXCEPTION' ELSE 'PERFORMED' END;

  ---------------------------------------------------------------- REVENUE_REC
  -- Every fee stream: closing balance must equal opening balance plus the
  -- period's source-side fees. delta = balance - opening - source_period.
  -- A cross-period reversal correctly shows up as a break (the month's
  -- revenue was reduced by an earlier period's reversal — a real adjustment
  -- the finance team must annotate), not silently absorbed.
  ELSIF p_item_key = 'REVENUE_REC' THEN
    CREATE TEMP TABLE IF NOT EXISTS _mec_revenue_streams ON COMMIT DROP AS
    SELECT * FROM (
      SELECT 'AGENCY' AS stream, a.account_number AS account, a.currency,
             COALESCE(op.net, 0) AS opening, COALESCE(pj.net, 0) AS journal, a.balance AS closing,
             (SELECT COALESCE(sum(tx.customer_fee), 0) FROM public.agency_transactions tx
              WHERE tx.currency = a.currency AND tx.status = 'SUCCESSFUL'
                AND tx.created_at >= v_start AND tx.created_at < v_next) AS source,
             a.balance - COALESCE(op.net, 0)
               - (SELECT COALESCE(sum(tx.customer_fee), 0) FROM public.agency_transactions tx
                  WHERE tx.currency = a.currency AND tx.status = 'SUCCESSFUL'
                    AND tx.created_at >= v_start AND tx.created_at < v_next) AS delta
      FROM public.ledger_accounts a
      LEFT JOIN LATERAL (SELECT sum(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END) AS net FROM public.ledger_entries e WHERE e.account_id = a.id AND e.created_at < v_start) op ON true
      LEFT JOIN LATERAL (SELECT sum(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END) AS net FROM public.ledger_entries e WHERE e.account_id = a.id AND e.created_at >= v_start AND e.created_at < v_next) pj ON true
      WHERE a.account_number LIKE 'AGENCY-FEE-REVENUE-%'
      UNION ALL
      SELECT 'MERCHANT', a.account_number, a.currency, COALESCE(op.net, 0), COALESCE(pj.net, 0), a.balance,
             (SELECT COALESCE(sum(m.fee), 0) FROM public.merchant_payment_transactions m
              WHERE m.currency = a.currency AND m.status = 'SUCCESSFUL' AND m.created_at >= v_start AND m.created_at < v_next),
             a.balance - COALESCE(op.net, 0)
               - (SELECT COALESCE(sum(m.fee), 0) FROM public.merchant_payment_transactions m
                  WHERE m.currency = a.currency AND m.status = 'SUCCESSFUL' AND m.created_at >= v_start AND m.created_at < v_next)
      FROM public.ledger_accounts a
      LEFT JOIN LATERAL (SELECT sum(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END) AS net FROM public.ledger_entries e WHERE e.account_id = a.id AND e.created_at < v_start) op ON true
      LEFT JOIN LATERAL (SELECT sum(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END) AS net FROM public.ledger_entries e WHERE e.account_id = a.id AND e.created_at >= v_start AND e.created_at < v_next) pj ON true
      WHERE a.account_number LIKE 'MERCHANT-FEE-REVENUE-%'
      UNION ALL
      SELECT 'ADASHI_FEES', a.account_number, a.currency, COALESCE(op.net, 0), COALESCE(pj.net, 0), a.balance,
             (SELECT COALESCE(sum(p.platform_fee), 0) FROM adashi.payouts p
              WHERE p.status = 'SUCCESS' AND p.currency = a.currency AND p.disbursed_at >= v_start AND p.disbursed_at < v_next),
             a.balance - COALESCE(op.net, 0)
               - (SELECT COALESCE(sum(p.platform_fee), 0) FROM adashi.payouts p
                  WHERE p.status = 'SUCCESS' AND p.currency = a.currency AND p.disbursed_at >= v_start AND p.disbursed_at < v_next)
      FROM public.ledger_accounts a
      LEFT JOIN LATERAL (SELECT sum(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END) AS net FROM public.ledger_entries e WHERE e.account_id = a.id AND e.created_at < v_start) op ON true
      LEFT JOIN LATERAL (SELECT sum(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END) AS net FROM public.ledger_entries e WHERE e.account_id = a.id AND e.created_at >= v_start AND e.created_at < v_next) pj ON true
      WHERE a.account_number LIKE 'ADASHI-FEE-REVENUE-%'
      UNION ALL
      SELECT 'ADASHI_AGENT_COMMISSION', a.account_number, a.currency, COALESCE(op.net, 0), COALESCE(pj.net, 0), a.balance,
             (SELECT COALESCE(sum(p.agent_commission), 0) FROM adashi.payouts p
              WHERE p.status = 'SUCCESS' AND p.currency = a.currency AND p.disbursed_at >= v_start AND p.disbursed_at < v_next),
             a.balance - COALESCE(op.net, 0)
               - (SELECT COALESCE(sum(p.agent_commission), 0) FROM adashi.payouts p
                  WHERE p.status = 'SUCCESS' AND p.currency = a.currency AND p.disbursed_at >= v_start AND p.disbursed_at < v_next)
      FROM public.ledger_accounts a
      LEFT JOIN LATERAL (SELECT sum(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END) AS net FROM public.ledger_entries e WHERE e.account_id = a.id AND e.created_at < v_start) op ON true
      LEFT JOIN LATERAL (SELECT sum(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END) AS net FROM public.ledger_entries e WHERE e.account_id = a.id AND e.created_at >= v_start AND e.created_at < v_next) pj ON true
      WHERE a.account_number LIKE 'ADASHI-AGENT-COMMISSION-%'
      UNION ALL
      SELECT 'FX_SWAP', a.account_number, a.currency, COALESCE(op.net, 0), COALESCE(pj.net, 0), a.balance,
             (SELECT COALESCE(sum(s.fee), 0) FROM public.customer_fx_swaps s
              WHERE s.from_currency = a.currency AND s.status = 'COMPLETED' AND s.created_at >= v_start AND s.created_at < v_next),
             a.balance - COALESCE(op.net, 0)
               - (SELECT COALESCE(sum(s.fee), 0) FROM public.customer_fx_swaps s
                  WHERE s.from_currency = a.currency AND s.status = 'COMPLETED' AND s.created_at >= v_start AND s.created_at < v_next)
      FROM public.ledger_accounts a
      LEFT JOIN LATERAL (SELECT sum(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END) AS net FROM public.ledger_entries e WHERE e.account_id = a.id AND e.created_at < v_start) op ON true
      LEFT JOIN LATERAL (SELECT sum(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount ELSE -e.amount END) AS net FROM public.ledger_entries e WHERE e.account_id = a.id AND e.created_at >= v_start AND e.created_at < v_next) pj ON true
      WHERE a.account_number LIKE 'FX-REVENUE-%'
    ) x;

    SELECT COALESCE(sum(delta), 0) INTO v_rev_delta FROM _mec_revenue_streams;

    SELECT jsonb_build_object(
      'streams', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.stream, x.account) FROM _mec_revenue_streams x), '[]'::jsonb),
      'note', 'Transfer fees are intentionally excluded: they are deferred pending B4 and never touch these revenue accounts. A cross-period reversal shows as a real break on purpose.'
    ) INTO v_result;

    v_item_status := CASE WHEN v_rev_delta <> 0 THEN 'EXCEPTION' ELSE 'PERFORMED' END;

  ------------------------------------------------------------- COMMISSION_REC
  -- Commission payable must equal the unpaid sub-ledger (EARNED +
  -- PENDING_SETTLEMENT); commission expense must equal everything ever earned
  -- that was not clawed back.
  ELSIF p_item_key = 'COMMISSION_REC' THEN
    SELECT COALESCE(sum(d.delta), 0) INTO v_comm_delta
    FROM (
      SELECT a.balance
        - (SELECT COALESCE(sum(c.amount), 0) FROM public.agent_commissions c
           WHERE c.currency = a.currency AND c.status IN ('EARNED','PENDING_SETTLEMENT')) AS delta
      FROM public.ledger_accounts a WHERE a.account_number LIKE 'COMMISSION-PAYABLE-%'
      UNION ALL
      SELECT a.balance
        + (SELECT COALESCE(sum(c.amount), 0) FROM public.agent_commissions c
           WHERE c.currency = a.currency AND c.status <> 'CLAWED_BACK') AS delta
      FROM public.ledger_accounts a WHERE a.account_number LIKE 'COMMISSION-EXPENSE-%'
    ) d;

    SELECT jsonb_build_object(
      'payable', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'account', a.account_number,
          'balance', a.balance,
          'subledger_unpaid', (SELECT COALESCE(sum(c.amount), 0) FROM public.agent_commissions c WHERE c.currency = a.currency AND c.status IN ('EARNED','PENDING_SETTLEMENT')),
          'delta', a.balance - (SELECT COALESCE(sum(c.amount), 0) FROM public.agent_commissions c WHERE c.currency = a.currency AND c.status IN ('EARNED','PENDING_SETTLEMENT'))
        ) ORDER BY a.account_number)
        FROM public.ledger_accounts a WHERE a.account_number LIKE 'COMMISSION-PAYABLE-%'), '[]'::jsonb),
      'expense', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'account', a.account_number,
          'balance', a.balance,
          'subledger_earned_not_clawed_back', (SELECT COALESCE(sum(c.amount), 0) FROM public.agent_commissions c WHERE c.currency = a.currency AND c.status <> 'CLAWED_BACK'),
          'delta', a.balance + (SELECT COALESCE(sum(c.amount), 0) FROM public.agent_commissions c WHERE c.currency = a.currency AND c.status <> 'CLAWED_BACK')
        ) ORDER BY a.account_number)
        FROM public.ledger_accounts a WHERE a.account_number LIKE 'COMMISSION-EXPENSE-%'), '[]'::jsonb),
      'subledger_status_counts', COALESCE((SELECT jsonb_object_agg(status, cnt) FROM (
          SELECT status, count(*) AS cnt FROM public.agent_commissions GROUP BY status
        ) s), '{}'::jsonb),
      'period_settlements', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'batch_reference', b.batch_reference, 'currency', b.currency,
          'total_commission_amount', b.total_commission_amount, 'total_agent_count', b.total_agent_count
        ) ORDER BY b.batch_reference)
        FROM public.settlement_batches b
        WHERE b.created_at >= v_start AND b.created_at < v_next), '[]'::jsonb)
    ) INTO v_result;

    v_item_status := CASE WHEN v_comm_delta <> 0 THEN 'EXCEPTION' ELSE 'PERFORMED' END;

  ------------------------------------------------------------- SUSPENSE_REVIEW
  -- A suspense balance at month end is a rec break by definition: every entry
  -- is listed with its age, and the checked write-off path is referenced.
  ELSIF p_item_key = 'SUSPENSE_REVIEW' THEN
    SELECT count(*) INTO v_suspense_nonzero
    FROM public.ledger_accounts a
    WHERE a.account_number LIKE 'SUSPENSE-%' AND a.balance <> 0;

    SELECT jsonb_build_object(
      'accounts', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'account', a.account_number,
          'currency', a.currency,
          'balance', a.balance,
          'entry_count', COALESCE(e.cnt, 0),
          'first_entry', e.first_at,
          'last_entry', e.last_at,
          'days_since_last_entry', CASE WHEN e.last_at IS NULL THEN NULL ELSE (CURRENT_DATE - e.last_at::date) END
        ) ORDER BY a.account_number)
        FROM public.ledger_accounts a
        LEFT JOIN LATERAL (
          SELECT count(*) AS cnt, min(x.created_at) AS first_at, max(x.created_at) AS last_at
          FROM (
            SELECT e.created_at FROM public.ledger_entries e WHERE e.account_id = a.id
          ) x
        ) e ON true
        WHERE a.account_number LIKE 'SUSPENSE-%'), '[]'::jsonb),
      'write_off_path', 'Suspense write-offs require the existing maker-checker SUSPENSE_WRITEOFF action — they are never single-person.'
    ) INTO v_result;

    v_item_status := CASE WHEN v_suspense_nonzero > 0 THEN 'EXCEPTION' ELSE 'PERFORMED' END;
  END IF;

  UPDATE public.month_end_close_items
  SET status = v_item_status,
      result = v_result,
      performed_by = p_performed_by,
      performed_at = now(),
      notes = p_notes,
      updated_at = now()
  WHERE checklist_id = v_id AND item_key = p_item_key;

  INSERT INTO public.audit_events (actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (
    v_actor, p_performed_by, 'BACK_OFFICE', 'MONTH_END_CLOSE_ITEM_PERFORMED', 'month_end_close_items',
    (SELECT id FROM public.month_end_close_items WHERE checklist_id = v_id AND item_key = p_item_key)::text,
    jsonb_build_object('item_key', p_item_key, 'year', p_year, 'month', p_month, 'is_drill', COALESCE(p_is_drill, false), 'status', v_item_status, 'result', v_result),
    'db-function', 'MEC-' || v_id, 'MEC-' || v_id
  );

  RETURN jsonb_build_object('checklist_id', v_id, 'item_key', p_item_key, 'status', v_item_status, 'result', v_result);
END;
$function$;

-- =============================================================================
-- S4. prepare_month_end_close — the maker step
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prepare_month_end_close(
  p_year integer,
  p_month integer,
  p_is_drill boolean DEFAULT false,
  p_prepared_by varchar(128) DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_id uuid;
  v_end date := (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::date;
  v_next date := v_end + 1;
  v_missing_closes date[];
  v_tb_inconsistent integer;
  v_summary jsonb;
  v_actor uuid;
BEGIN
  v_id := public.open_month_end_close(p_year, p_month, p_is_drill, p_prepared_by);

  IF (SELECT status FROM public.month_end_close_checklists WHERE id = v_id) <> 'OPEN' THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_ALREADY_DECIDED';
  END IF;

  IF p_prepared_by IS NULL OR length(trim(p_prepared_by)) < 3 THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_ACTOR_REQUIRED';
  END IF;
  SELECT id INTO v_actor FROM public.user_profiles WHERE lower(email) = lower(trim(p_prepared_by)) LIMIT 1;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_ACTOR_PROFILE_REQUIRED';
  END IF;

  IF EXISTS (SELECT 1 FROM public.month_end_close_items WHERE checklist_id = v_id AND status <> 'PERFORMED') THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_ITEMS_INCOMPLETE';
  END IF;

  -- A real (non-drill) close requires the month to be over.
  IF NOT COALESCE(p_is_drill, false) AND CURRENT_DATE <= v_end THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_PERIOD_INCOMPLETE';
  END IF;

  -- Every day WITH JOURNAL ACTIVITY in the period must have a daily close.
  SELECT array_agg(d ORDER BY d) INTO v_missing_closes
  FROM (
    SELECT DISTINCT t.created_at::date AS d
    FROM public.ledger_transactions t
    WHERE t.created_at >= make_date(p_year, p_month, 1) AND t.created_at < v_next
      AND t.created_at::date <= LEAST(CURRENT_DATE, v_next - 1)
      AND NOT EXISTS (SELECT 1 FROM public.daily_financial_closes c WHERE c.close_date = t.created_at::date)
  ) x;

  IF NOT COALESCE(p_is_drill, false) AND v_missing_closes IS NOT NULL AND array_length(v_missing_closes, 1) > 0 THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_MISSING_DAILY_CLOSES: %', v_missing_closes;
  END IF;

  -- The trial balance must be consistent: every stored account balance equal
  -- to its journal-derived balance. This is the LIVE trial balance (as of
  -- today) — the ledger's immutability regime means no backdating exists, so
  -- period integrity is enforced by the daily-close coverage check above.
  SELECT count(*) INTO v_tb_inconsistent
  FROM public.generate_trial_balance(NULL, CURRENT_DATE)
  WHERE NOT is_consistent;

  IF v_tb_inconsistent > 0 THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_TRIAL_BALANCE_INCONSISTENT';
  END IF;

  SELECT jsonb_build_object(
    'missing_daily_closes', COALESCE(to_jsonb(v_missing_closes), '[]'::jsonb),
    'trial_balance_inconsistent_rows', v_tb_inconsistent,
    'items', (SELECT jsonb_object_agg(item_key, status) FROM public.month_end_close_items WHERE checklist_id = v_id),
    'period', jsonb_build_object('year', p_year, 'month', p_month, 'end', v_end, 'is_drill', COALESCE(p_is_drill, false)),
    'month_complete', CURRENT_DATE > v_end,
    'notes', p_notes
  ) INTO v_summary;

  UPDATE public.month_end_close_checklists
  SET status = 'PREPARED', prepared_by = p_prepared_by, prepared_at = now(), prepare_summary = v_summary, updated_at = now()
  WHERE id = v_id;

  INSERT INTO public.audit_events (actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (v_actor, p_prepared_by, 'BACK_OFFICE', 'MONTH_END_CLOSE_PREPARED', 'month_end_close_checklists', v_id::text,
          jsonb_build_object('summary', v_summary), 'db-function', 'MEC-' || v_id, 'MEC-' || v_id);

  RETURN jsonb_build_object('checklist_id', v_id, 'status', 'PREPARED', 'summary', v_summary);
END;
$function$;

-- =============================================================================
-- S5. review_month_end_close — the checker step (four-eyes)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.review_month_end_close(
  p_year integer,
  p_month integer,
  p_is_drill boolean DEFAULT false,
  p_reviewed_by varchar(128) DEFAULT NULL,
  p_decision varchar(16) DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_id uuid;
  v_row public.month_end_close_checklists;
  v_status varchar(16);
  v_actor uuid;
BEGIN
  IF p_decision NOT IN ('APPROVE','REJECT') THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_INVALID_DECISION';
  END IF;
  IF p_reviewed_by IS NULL OR length(trim(p_reviewed_by)) < 3 THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_REVIEWER_REQUIRED';
  END IF;
  IF p_notes IS NULL OR length(trim(p_notes)) < 20 THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_REVIEW_NOTES_REQUIRED';
  END IF;
  SELECT id INTO v_actor FROM public.user_profiles WHERE lower(email) = lower(trim(p_reviewed_by)) LIMIT 1;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_ACTOR_PROFILE_REQUIRED';
  END IF;

  SELECT * INTO v_row FROM public.month_end_close_checklists
  WHERE period_year = p_year AND period_month = p_month AND is_drill = COALESCE(p_is_drill, false);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_NOT_FOUND';
  END IF;
  IF v_row.status <> 'PREPARED' THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_NOT_PREPARED';
  END IF;
  -- Four-eyes: the reviewer must be a different person than the preparer —
  -- compared by login email, mirroring the B8 self-approval guard.
  IF lower(v_row.prepared_by) = lower(NULLIF(trim(p_reviewed_by), '')) THEN
    RAISE EXCEPTION 'MONTH_END_CLOSE_SELF_REVIEW_FORBIDDEN';
  END IF;

  v_status := CASE WHEN p_decision = 'APPROVE' THEN 'CLOSED' ELSE 'OPEN' END;

  UPDATE public.month_end_close_checklists
  SET status = v_status,
      reviewed_by = p_reviewed_by,
      reviewed_at = now(),
      review_notes = p_notes,
      updated_at = now()
  WHERE id = v_row.id;

  INSERT INTO public.control_approval_events (approval_type, reference_id, actor_id, decision, notes)
  VALUES ('MONTH_END_CLOSE', v_row.id, p_reviewed_by, p_decision, p_notes);

  INSERT INTO public.audit_events (actor_id, actor_email, actor_role, action, resource_type, resource_id, details, ip_address, request_id, correlation_id)
  VALUES (v_actor, p_reviewed_by, 'BACK_OFFICE',
          CASE WHEN p_decision = 'APPROVE' THEN 'MONTH_END_CLOSE_APPROVED' ELSE 'MONTH_END_CLOSE_REJECTED' END,
          'month_end_close_checklists', v_row.id::text,
          jsonb_build_object('decision', p_decision, 'notes', p_notes,
                             'prepared_by', v_row.prepared_by, 'is_drill', v_row.is_drill,
                             'prepare_summary', v_row.prepare_summary),
          'db-function', 'MEC-' || v_row.id, 'MEC-' || v_row.id);

  RETURN jsonb_build_object('checklist_id', v_row.id, 'status', v_status, 'decision', p_decision,
                            'is_drill', v_row.is_drill, 'period', jsonb_build_object('year', p_year, 'month', p_month));
END;
$function$;

-- =============================================================================
-- S6. Permissions — service_role only, like every other control function
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.open_month_end_close(integer, integer, boolean, varchar) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_month_end_close_item(integer, integer, varchar, boolean, varchar, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prepare_month_end_close(integer, integer, boolean, varchar, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_month_end_close(integer, integer, boolean, varchar, varchar, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_month_end_close(integer, integer, boolean, varchar) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_month_end_close_item(integer, integer, varchar, boolean, varchar, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_month_end_close(integer, integer, boolean, varchar, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_month_end_close(integer, integer, boolean, varchar, varchar, text) TO service_role;

COMMIT;

-- =============================================================================
-- S7. Merchant payout reversals are linked, not name-excluded (companion to
--     the M12 S6 pattern on agency_transactions). The daily close's orphan
--     detector had to exclude the PAYOUT-REVERSAL-TEST journal BY NAME; with
--     a structural link that wart is removed (close v7 re-applied in this
--     migration's S8).
-- =============================================================================

ALTER TABLE public.merchant_payout_requests
  ADD COLUMN IF NOT EXISTS reversal_ledger_transaction_id uuid REFERENCES public.ledger_transactions(id);

COMMENT ON COLUMN public.merchant_payout_requests.reversal_ledger_transaction_id IS 'The journal that inverted this payout (an executed-then-reversed payout request). Makes the payout reversal journal structurally linked instead of name-excluded from orphan detection.';

-- Backfill: link a payout journal's exact inversion (same per-account nets
-- with opposite signs, posted at or after the original). Deterministic.
UPDATE public.merchant_payout_requests mpr
SET reversal_ledger_transaction_id = r.id
FROM public.ledger_transactions l,
LATERAL (
  SELECT rr.id
  FROM public.ledger_transactions rr
  WHERE rr.id <> l.id
    AND rr.created_at >= l.created_at
    AND (SELECT COALESCE(jsonb_object_agg(account_id, net), '{}'::jsonb)
         FROM (SELECT account_id, sum(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END) AS net
               FROM public.ledger_entries WHERE transaction_id = l.id GROUP BY account_id) a)
        =
        (SELECT COALESCE(jsonb_object_agg(account_id, -net), '{}'::jsonb)
         FROM (SELECT account_id, sum(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END) AS net
               FROM public.ledger_entries WHERE transaction_id = rr.id GROUP BY account_id) b)
  ORDER BY rr.created_at
  LIMIT 1
) r
WHERE mpr.ledger_transaction_id = l.id
  AND mpr.reversal_ledger_transaction_id IS NULL;

-- =============================================================================
-- S8. Close v7 re-apply: the orphan detector now uses the structural payout
--     reversal link (S7) instead of excluding PAYOUT-REVERSAL-TEST journals
--     by name. Identical to 000059's close v7 in every other respect.
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

