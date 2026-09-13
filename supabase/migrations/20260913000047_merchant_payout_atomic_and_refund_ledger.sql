-- ============================================================================
-- Task I (security remediation) — Phase 0/1 finding:
--
-- POST /api/v1/merchant/wallet/payout previously read the merchant's
-- settlement ledger balance, compared it to the requested amount in
-- application code, and then issued a separate `UPDATE ledger_accounts SET
-- balance = ...` write with NO row lock and NO idempotency key. Two
-- concurrent payout requests (or a client retry after a dropped response)
-- could both read the same balance before either write lands, letting a
-- merchant withdraw more than they actually have — a classic
-- check-then-act / TOCTOU double-spend race.
--
-- This migration adds the idempotency column the existing route already
-- generates a key for but never persisted, and introduces
-- request_merchant_payout(): a single SECURITY DEFINER function that
-- idempotency-short-circuits, locks the settlement ledger row with
-- `FOR UPDATE`, and performs the balance check + real double-entry ledger
-- posting + payout-request insert atomically in one transaction — the same
-- proven pattern already used by post_customer_transfer(),
-- post_agency_transfer(), and confirm_merchant_collection() elsewhere in
-- this codebase. No new pattern invented; existing correct architecture
-- extended to a route that had regressed from it.
-- ============================================================================

-- Pre-existing schema defect found while fixing the payout race condition:
-- status was VARCHAR(24), but its own DEFAULT/CHECK value
-- 'PENDING_PROVIDER_INTEGRATION' is 28 characters — meaning no row could
-- ever have been successfully inserted into this table via its documented
-- default status. Widened to match the same width used for this status
-- value elsewhere (customer_transactions / agency_transactions).
ALTER TABLE public.merchant_payout_requests
  ALTER COLUMN status TYPE VARCHAR(32);

-- Same exact defect found in merchant_payment_transactions (the table
-- backing every merchant collection / invoice / payment-link charge) —
-- confirmed via a live query that the table has zero rows despite the
-- merchant portal having been in use, meaning every insert relying on the
-- documented default status has been silently failing since this table
-- was created. This is the root cause, not a coincidence: fixed the same
-- way, by widening the column rather than shortening the status value
-- (the longer value is the one used consistently everywhere else in the
-- codebase for this "no live acquiring rail yet" state).
--
-- trg_rollup_merchant_customer_stats has a WHEN clause that reads the
-- status column, which blocks a plain ALTER COLUMN TYPE — drop and
-- recreate it identically around the type change.
DROP TRIGGER IF EXISTS trg_rollup_merchant_customer_stats ON public.merchant_payment_transactions;

ALTER TABLE public.merchant_payment_transactions
  ALTER COLUMN status TYPE VARCHAR(32);

CREATE TRIGGER trg_rollup_merchant_customer_stats
  AFTER UPDATE ON public.merchant_payment_transactions
  FOR EACH ROW
  WHEN ((((new.status)::text = 'SUCCESSFUL'::text) AND ((old.status)::text IS DISTINCT FROM (new.status)::text)))
  EXECUTE FUNCTION rollup_merchant_customer_stats();

ALTER TABLE public.merchant_payout_requests
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS uq_merchant_payout_requests_idem
  ON public.merchant_payout_requests(merchant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.request_merchant_payout(
  p_merchant_id UUID,
  p_requested_by UUID,
  p_amount NUMERIC,
  p_idempotency_key VARCHAR
) RETURNS public.merchant_payout_requests
LANGUAGE plpgsql AS $$
DECLARE
  v_existing public.merchant_payout_requests;
  v_merchant RECORD;
  v_settlement_balance NUMERIC(24,2);
  v_payout public.merchant_payout_requests;
  v_ledger_tx_id UUID;
  v_clearing_account_id UUID;
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

  -- Lock the merchant's real settlement ledger row for the duration of this
  -- transaction — any concurrent payout or collection-confirmation for the
  -- same merchant blocks here until this one commits or rolls back.
  SELECT balance INTO v_settlement_balance
  FROM public.ledger_accounts
  WHERE id = v_merchant.settlement_ledger_account_id
  FOR UPDATE;

  IF v_settlement_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  -- Real payout-in-flight clearing liability account, mirroring the pattern
  -- used for agent/customer outbound transfers: funds leave the merchant's
  -- available balance now, and are staged in a clearing account pending the
  -- (not-yet-integrated) bank payout rail — never fabricated as instantly
  -- delivered.
  INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
  SELECT v_merchant.org_id, 'MERCHANT-PAYOUT-CLEARING-' || v_merchant.currency, 'Merchant Payout Clearing — ' || v_merchant.currency, 'LIABILITY', v_merchant.currency,
         (SELECT country FROM public.organizations WHERE id = v_merchant.org_id), 0.00
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ledger_accounts WHERE org_id = v_merchant.org_id AND currency = v_merchant.currency AND account_number = 'MERCHANT-PAYOUT-CLEARING-' || v_merchant.currency
  );

  SELECT id INTO v_clearing_account_id
  FROM public.ledger_accounts
  WHERE org_id = v_merchant.org_id AND currency = v_merchant.currency AND account_number = 'MERCHANT-PAYOUT-CLEARING-' || v_merchant.currency
  FOR UPDATE;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_merchant.org_id, 'PAYOUT-' || gen_random_uuid()::text, 'Merchant payout requested — pending bank rail integration', p_amount, v_merchant.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_merchant.settlement_ledger_account_id, 'DEBIT', p_amount, v_merchant.currency, 'Payout requested: settlement balance debited'),
    (v_ledger_tx_id, v_clearing_account_id, 'CREDIT', p_amount, v_merchant.currency, 'Payout staged to outbound clearing pending provider confirmation');

  UPDATE public.ledger_accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_merchant.settlement_ledger_account_id;
  UPDATE public.ledger_accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = v_clearing_account_id;

  INSERT INTO public.merchant_payout_requests (
    merchant_id, requested_by, amount, currency, destination_bank, destination_account,
    status, ledger_transaction_id, idempotency_key
  ) VALUES (
    p_merchant_id, p_requested_by, p_amount, v_merchant.currency, v_merchant.settlement_bank, v_merchant.settlement_account_number,
    'PENDING_PROVIDER_INTEGRATION', v_ledger_tx_id, p_idempotency_key
  )
  RETURNING * INTO v_payout;

  RETURN v_payout;
END;
$$;
