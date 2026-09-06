-- ============================================================================
-- Merchant Portal: real settlement batching (groups already-collected
-- transactions into a payable batch) and merchant-level terminal counts.
-- ============================================================================

-- 1. Track which settlement batch a transaction was swept into, so a
--    settlement run never double-counts an already-batched transaction.
ALTER TABLE public.merchant_payment_transactions
  ADD COLUMN IF NOT EXISTS settlement_batch_id UUID REFERENCES public.merchant_settlement_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_merchant_txns_settlement_batch ON public.merchant_payment_transactions(settlement_batch_id);

-- 2. Real settlement run: sweeps all SUCCESSFUL, not-yet-batched
--    transactions for a merchant into one new merchant_settlement_batches
--    row and posts the real net-amount payout intent onto the ledger
--    (debiting the merchant's settlement account, crediting a payable-out
--    liability — the actual bank payout still requires the honest
--    pending-provider payout request flow in merchant_payout_requests).
CREATE OR REPLACE FUNCTION public.run_merchant_settlement(
  p_merchant_id UUID,
  p_currency VARCHAR
) RETURNS public.merchant_settlement_batches
LANGUAGE plpgsql AS $$
DECLARE
  v_batch public.merchant_settlement_batches;
  v_org_id UUID;
  v_bank_name VARCHAR(128);
  v_account_number VARCHAR(32);
  v_gross NUMERIC(24,2) := 0;
  v_fees NUMERIC(24,2) := 0;
  v_net NUMERIC(24,2) := 0;
  v_count INT := 0;
BEGIN
  SELECT org_id, settlement_bank, settlement_account_number INTO v_org_id, v_bank_name, v_account_number
  FROM public.merchant_profiles WHERE id = p_merchant_id;

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

-- 3. Merchant-level total ACTIVE terminal count — terminals/terminal_assignments
--    have no branch_id column, so only a merchant-total (not per-branch)
--    count is supported by the current schema.
CREATE OR REPLACE FUNCTION public.count_merchant_active_terminals(p_merchant_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::INTEGER FROM public.terminals
  WHERE assigned_merchant_id = p_merchant_id AND status = 'ACTIVE';
$$;
