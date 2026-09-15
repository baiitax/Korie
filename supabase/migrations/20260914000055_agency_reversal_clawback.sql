-- =============================================================================
-- 20260914000055_agency_reversal_clawback.sql
--
-- Commission clawbacks + the sanctioned agency-transaction reversal path
-- (assessment: "Clawbacks: NOT IMPLEMENTED — reversal of an agency
-- transaction would leave its EARNED commission standing"; §44 "reverse +
-- clawback" control gap; commission-policy re-score row).
--
--   S1  BUG FIX in post_agency_cash_transaction (signature unchanged): the
--       fee/commission legs made it update CASH_IN_HAND twice in one
--       transaction (+amount, then −fee). The ledger's deferred
--       balance-derivation triggers validate every queued account-update
--       snapshot against the transaction's FINAL journal-derived balance, so
--       any new transaction with a nonzero customer fee failed at commit
--       with LEDGER_BALANCE_DRIFT (probe-verified before this fix; the two
--       pre-existing transactions predate the fee-journalisation rewrite,
--       which is why production had not hit it yet). The function now
--       computes each account's NET delta and updates it exactly once.
--       The CASH_OUT sufficiency check now includes the fee.
--   S2  agent_commissions: CLAWED_BACK status + clawback attribution
--       columns.
--   S3  reverse_agency_transaction (new): the sanctioned reversal. One
--       journal inverts the whole original posting — money legs, fee legs,
--       commission legs — and the commission row is clawed back. If the
--       commission was already PAID (settled to the agent's float), the
--       clawback is recovered from the agent's wallet float instead of the
--       (already-settled) payable, fail-closed on insufficient float.
--       Statuses: SUCCESSFUL -> REVERSED; EARNED/PENDING_SETTLEMENT/PAID ->
--       CLAWED_BACK. Idempotent: a transaction reverses exactly once.
--
-- No existing function signature changes.
-- =============================================================================

-- =============================================================================
-- S1. post_agency_cash_transaction — net-per-account balance updates
-- =============================================================================

CREATE OR REPLACE FUNCTION public.post_agency_cash_transaction(p_agent_id uuid, p_org_id uuid, p_transaction_type character varying, p_amount numeric, p_currency character varying, p_customer_fee numeric, p_agent_commission numeric, p_customer_name character varying, p_customer_phone character varying, p_customer_account character varying, p_customer_bank character varying, p_idempotency_key character varying, p_reference character varying)
 RETURNS agency_transactions
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_wallet_float_id UUID;
    v_cash_hand_id UUID;
    v_wallet_float_balance NUMERIC(24,2);
    v_existing public.agency_transactions;
    v_ledger_tx_id UUID;
    v_agency_tx public.agency_transactions;
    v_agent_daily_limit NUMERIC(24,2);
    v_agent_single_limit NUMERIC(24,2);
    v_today_spent NUMERIC(24,2);
    v_fee NUMERIC(24,2);
    v_commission NUMERIC(24,2);
    v_fee_revenue_id UUID;
    v_commission_expense_id UUID;
    v_commission_payable_id UUID;
    v_cash_hand_delta NUMERIC(24,2);
BEGIN
    v_fee := COALESCE(p_customer_fee, 0);
    v_commission := COALESCE(p_agent_commission, 0);

    SELECT * INTO v_existing
    FROM public.agency_transactions
    WHERE agent_id = p_agent_id AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN v_existing;
    END IF;

    -- Enforce per-agent limits before touching any balance (fail closed).
    -- This applies to EVERY caller of this function — there is no path
    -- that bypasses it.
    SELECT daily_cash_limit, single_transaction_limit INTO v_agent_daily_limit, v_agent_single_limit
    FROM public.agents WHERE id = p_agent_id FOR UPDATE;

    IF v_agent_single_limit IS NOT NULL AND p_amount > v_agent_single_limit THEN
        RAISE EXCEPTION 'SINGLE_TRANSACTION_LIMIT_EXCEEDED';
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_today_spent
    FROM public.agency_transactions
    WHERE agent_id = p_agent_id
      AND status IN ('SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION')
      AND created_at >= date_trunc('day', NOW());

    IF v_agent_daily_limit IS NOT NULL AND (v_today_spent + p_amount) > v_agent_daily_limit THEN
        RAISE EXCEPTION 'DAILY_CASH_LIMIT_EXCEEDED';
    END IF;

    SELECT la.id, la.balance INTO v_wallet_float_id, v_wallet_float_balance
    FROM public.agent_float_accounts afa
    JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
    WHERE afa.agent_id = p_agent_id AND afa.account_kind = 'WALLET_FLOAT' AND afa.currency = p_currency
    FOR UPDATE OF la;

    SELECT la.id INTO v_cash_hand_id
    FROM public.agent_float_accounts afa
    JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
    WHERE afa.agent_id = p_agent_id AND afa.account_kind = 'CASH_IN_HAND' AND afa.currency = p_currency
    FOR UPDATE OF la;

    IF v_wallet_float_id IS NULL OR v_cash_hand_id IS NULL THEN
        RAISE EXCEPTION 'AGENT_FLOAT_NOT_PROVISIONED';
    END IF;

    IF p_transaction_type = 'CASH_IN' THEN
        IF v_wallet_float_balance < p_amount THEN
            RAISE EXCEPTION 'INSUFFICIENT_WALLET_FLOAT';
        END IF;
    ELSIF p_transaction_type = 'CASH_OUT' THEN
        -- Cash-out dispenses the amount AND collects the fee in cash, so the
        -- cash-in-hand position must cover both.
        IF (SELECT balance FROM public.ledger_accounts WHERE id = v_cash_hand_id) < (p_amount + v_fee) THEN
            RAISE EXCEPTION 'INSUFFICIENT_CASH_IN_HAND';
        END IF;
    ELSE
        RAISE EXCEPTION 'UNSUPPORTED_TRANSACTION_TYPE';
    END IF;

    -- Fee revenue account (one per currency).
    IF v_fee > 0 THEN
        INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
        SELECT p_org_id, 'AGENCY-FEE-REVENUE-' || p_currency, 'Agency Customer Fee Revenue — ' || p_currency, 'REVENUE', p_currency,
               (SELECT country FROM public.organizations WHERE id = p_org_id), 0.00
        WHERE NOT EXISTS (
            SELECT 1 FROM public.ledger_accounts WHERE currency = p_currency AND account_number = 'AGENCY-FEE-REVENUE-' || p_currency
        );
        SELECT id INTO v_fee_revenue_id FROM public.ledger_accounts
        WHERE currency = p_currency AND account_number = 'AGENCY-FEE-REVENUE-' || p_currency;
    END IF;

    -- Commission expense / payable accounts (one per currency).
    IF v_commission > 0 THEN
        INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
        SELECT p_org_id, 'COMMISSION-EXPENSE-' || p_currency, 'Agent Commission Expense — ' || p_currency, 'EXPENSE', p_currency,
               (SELECT country FROM public.organizations WHERE id = p_org_id), 0.00
        WHERE NOT EXISTS (
            SELECT 1 FROM public.ledger_accounts WHERE currency = p_currency AND account_number = 'COMMISSION-EXPENSE-' || p_currency
        );
        SELECT id INTO v_commission_expense_id FROM public.ledger_accounts
        WHERE currency = p_currency AND account_number = 'COMMISSION-EXPENSE-' || p_currency;

        INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
        SELECT p_org_id, 'COMMISSION-PAYABLE-' || p_currency, 'Agent Commission Payable — ' || p_currency, 'LIABILITY', p_currency,
               (SELECT country FROM public.organizations WHERE id = p_org_id), 0.00
        WHERE NOT EXISTS (
            SELECT 1 FROM public.ledger_accounts WHERE currency = p_currency AND account_number = 'COMMISSION-PAYABLE-' || p_currency
        );
        SELECT id INTO v_commission_payable_id FROM public.ledger_accounts
        WHERE currency = p_currency AND account_number = 'COMMISSION-PAYABLE-' || p_currency;
    END IF;

    INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
    VALUES (p_org_id, p_reference, p_transaction_type || ' via agent', p_amount + v_fee + v_commission, p_currency, 'COMMITTED')
    RETURNING id INTO v_ledger_tx_id;

    -- Net per-account deltas: each account is updated EXACTLY ONCE per
    -- transaction (the deferred integrity triggers validate every update
    -- snapshot against the final journal-derived balance).
    IF p_transaction_type = 'CASH_IN' THEN
        v_cash_hand_delta := p_amount - v_fee;
        INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
        VALUES
            (v_ledger_tx_id, v_wallet_float_id, 'DEBIT', p_amount, p_currency, 'Cash-in: wallet float debited'),
            (v_ledger_tx_id, v_cash_hand_id, 'CREDIT', p_amount, p_currency, 'Cash-in: physical cash received');
    ELSE
        v_cash_hand_delta := -(p_amount + v_fee);
        INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
        VALUES
            (v_ledger_tx_id, v_cash_hand_id, 'DEBIT', p_amount, p_currency, 'Cash-out: physical cash dispensed'),
            (v_ledger_tx_id, v_wallet_float_id, 'CREDIT', p_amount, p_currency, 'Cash-out: wallet float credited');
    END IF;

    -- Fee leg: the agent collected the fee in cash and owes it to KoriePay,
    -- so the agent cash-in-hand position is debited (reduced) by the fee and
    -- agency fee revenue is credited.
    IF v_fee > 0 THEN
        INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
        VALUES
            (v_ledger_tx_id, v_cash_hand_id, 'DEBIT', v_fee, p_currency, 'Agency transaction fee collected in cash, owed to KoriePay'),
            (v_ledger_tx_id, v_fee_revenue_id, 'CREDIT', v_fee, p_currency, 'Agency customer fee revenue recognised');
    END IF;

    -- Commission legs: expense recognised and payable accrued at earning time,
    -- so the daily settlement run can only ever settle an already-funded
    -- payable (no more minting).
    IF v_commission > 0 THEN
        INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
        VALUES
            (v_ledger_tx_id, v_commission_expense_id, 'DEBIT', v_commission, p_currency, 'Agent commission expense recognised at earning'),
            (v_ledger_tx_id, v_commission_payable_id, 'CREDIT', v_commission, p_currency, 'Agent commission payable accrued at earning');
    END IF;

    -- Single net update per account.
    UPDATE public.ledger_accounts SET balance = balance + v_cash_hand_delta, updated_at = NOW() WHERE id = v_cash_hand_id;
    UPDATE public.ledger_accounts SET balance = balance + CASE WHEN p_transaction_type = 'CASH_IN' THEN -p_amount ELSE p_amount END, updated_at = NOW() WHERE id = v_wallet_float_id;
    IF v_fee > 0 THEN
        UPDATE public.ledger_accounts SET balance = balance + v_fee, updated_at = NOW() WHERE id = v_fee_revenue_id;
    END IF;
    IF v_commission > 0 THEN
        UPDATE public.ledger_accounts SET balance = balance - v_commission, updated_at = NOW() WHERE id = v_commission_expense_id;
        UPDATE public.ledger_accounts SET balance = balance + v_commission, updated_at = NOW() WHERE id = v_commission_payable_id;
    END IF;

    INSERT INTO public.agency_transactions (
        agent_id, ledger_transaction_id, idempotency_key, reference, transaction_type,
        amount, customer_fee, agent_commission, currency, status,
        customer_name, customer_phone, customer_account, customer_bank, completed_at
    ) VALUES (
        p_agent_id, v_ledger_tx_id, p_idempotency_key, p_reference, p_transaction_type,
        p_amount, p_customer_fee, p_agent_commission, p_currency, 'SUCCESSFUL',
        p_customer_name, p_customer_phone, p_customer_account, p_customer_bank, NOW()
    ) RETURNING * INTO v_agency_tx;

    IF p_agent_commission > 0 THEN
        INSERT INTO public.agent_commissions (agent_id, agency_transaction_id, amount, currency, status)
        VALUES (p_agent_id, v_agency_tx.id, p_agent_commission, p_currency, 'EARNED');
    END IF;

    RETURN v_agency_tx;
END;
$function$;

-- =============================================================================
-- S2. Commission clawback schema
-- =============================================================================

ALTER TABLE public.agent_commissions
  ADD COLUMN IF NOT EXISTS clawed_back_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clawed_back_by CHARACTER VARYING(128);

ALTER TABLE public.agent_commissions DROP CONSTRAINT IF EXISTS agent_commissions_status_check;
ALTER TABLE public.agent_commissions
  ADD CONSTRAINT agent_commissions_status_check CHECK (
    status IN ('EARNED', 'PENDING_SETTLEMENT', 'PAID', 'CLAWED_BACK')
  );

-- =============================================================================
-- S3. reverse_agency_transaction — sanctioned reversal + clawback
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reverse_agency_transaction(
  p_transaction_id uuid,
  p_reversed_by character varying,
  p_reason text DEFAULT NULL)
RETURNS public.agency_transactions
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

  UPDATE public.agency_transactions SET status = 'REVERSED'
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
$function$;
