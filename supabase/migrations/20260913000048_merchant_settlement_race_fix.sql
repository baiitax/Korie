-- ============================================================================
-- Fix: run_merchant_settlement() had no locking and no idempotency guard.
--
-- Bug (real TOCTOU race, same class as the merchant-payout fix in
-- 20260913000047): two concurrent calls for the same merchant+currency
-- (double-click on "Run settlement", or a client retry after a timed-out
-- request — there is no idempotency key on this endpoint) could both:
--   1. SELECT the same SUCCESSFUL, settlement_batch_id IS NULL transactions
--      and compute the same gross/fee/net sums from them (no row lock was
--      taken on either the merchant or the candidate transactions),
--   2. INSERT two separate merchant_settlement_batches rows, each recording
--      the same totals,
--   3. UPDATE ... WHERE settlement_batch_id IS NULL to attach transactions —
--      whichever UPDATE commits first "wins" all the rows, so the SECOND
--      batch's stored header (gross_amount/total_fees/net_amount/
--      transaction_count) no longer matches what actually ends up attached
--      to it. That is a real financial-correctness defect — a settlement
--      batch whose recorded numbers don't reconcile against its own lines —
--      not merely a duplicate-request annoyance.
--
-- Fix: take a SELECT ... FOR UPDATE lock on the merchant's settlement
-- profile row before reading or claiming any transactions. This serializes
-- concurrent settlement runs for the same merchant: a second call blocks
-- until the first call's transaction has committed (batch inserted,
-- transactions claimed), then re-reads the now-current state — by which
-- point the first call's rows are no longer settlement_batch_id IS NULL,
-- so the second call correctly sees zero remaining eligible transactions
-- (NO_TRANSACTIONS_TO_SETTLE) instead of double-counting. The SELECT-sum
-- and UPDATE-claim below are otherwise unchanged from the original
-- function; they are safe once serialized behind the lock.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_merchant_settlement(
  p_merchant_id UUID,
  p_currency VARCHAR
) RETURNS public.merchant_settlement_batches
LANGUAGE plpgsql AS $$
DECLARE
  v_batch public.merchant_settlement_batches;
  v_bank_name VARCHAR(128);
  v_account_number VARCHAR(32);
  v_gross NUMERIC(24,2) := 0;
  v_fees NUMERIC(24,2) := 0;
  v_net NUMERIC(24,2) := 0;
  v_count INT := 0;
BEGIN
  -- Lock the merchant's settlement profile row. Any concurrent call for
  -- this same merchant now blocks here until this transaction commits or
  -- rolls back, and then re-evaluates against fresh (post-commit) state —
  -- closing the race without needing a new column or constraint.
  SELECT settlement_bank, settlement_account_number INTO v_bank_name, v_account_number
  FROM public.merchant_profiles WHERE id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MERCHANT_NOT_FOUND';
  END IF;

  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(fee), 0), COALESCE(SUM(net_amount), 0), COUNT(*)
  INTO v_gross, v_fees, v_net, v_count
  FROM public.merchant_payment_transactions
  WHERE merchant_id = p_merchant_id
    AND currency = p_currency
    AND status = 'SUCCESSFUL'
    AND settlement_batch_id IS NULL;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'NO_TRANSACTIONS_TO_SETTLE';
  END IF;

  INSERT INTO public.merchant_settlement_batches (
    merchant_id, batch_reference, gross_amount, total_fees, refunds_deducted, net_amount,
    currency, bank_name, account_number, status, transaction_count
  ) VALUES (
    p_merchant_id, 'MST-' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '-' || upper(p_currency),
    v_gross, v_fees, 0, v_net, p_currency, v_bank_name, v_account_number, 'SCHEDULED', v_count
  ) RETURNING * INTO v_batch;

  UPDATE public.merchant_payment_transactions
  SET settlement_batch_id = v_batch.id
  WHERE merchant_id = p_merchant_id
    AND currency = p_currency
    AND status = 'SUCCESSFUL'
    AND settlement_batch_id IS NULL;

  RETURN v_batch;
END;
$$;

COMMENT ON FUNCTION public.run_merchant_settlement(UUID, VARCHAR) IS
  'Sweeps SUCCESSFUL, unbatched transactions for a merchant+currency into a new settlement batch. Fixed 2026-09-13 to close a TOCTOU race: the merchant profile row is now locked FOR UPDATE before reading/claiming transactions, serializing concurrent settlement runs for the same merchant so two calls can never double-count or mis-attribute the same transactions across two batches.';
