-- =============================================================================
-- Migration: Real dispute resolution posting (Task I security remediation)
-- =============================================================================
-- Root cause fixed:
--   SupportOpsEngine.decideDispute() previously recorded REFUND_APPROVED /
--   REVERSAL_APPROVED / PARTIAL_REFUND outcomes purely by calling an in-memory
--   fixture engine (DisputeChargebackEngine) and writing its fabricated
--   "recovery case reference" into support_disputes.recovery_case_reference.
--   No ledger entry, wallet credit, or transaction status change ever
--   occurred - officers could approve a refund and the customer's balance
--   would never move.
--
-- This migration adds two SECURITY DEFINER functions:
--
--   1. public.post_dispute_resolution() - REAL balanced double-entry posting
--      for financial decisions (REFUND_APPROVED / REVERSAL_APPROVED /
--      PARTIAL_REFUND). Modeled on the existing post_customer_transfer /
--      request_merchant_payout pattern: lock rows FOR UPDATE, insert a
--      balanced ledger_transactions + ledger_entries pair, update
--      ledger_accounts.balance and wallets.balance in lockstep (required by
--      the live trg_account_balance_derivation / trg_wallet_ledger_sync
--      integrity triggers), update customer_transactions.status, and record
--      the real decision + a real recovery_case_reference on support_disputes.
--
--   2. public.record_dispute_non_financial_decision() - plain status update
--      for REJECTED / UNDER_INVESTIGATION (no money movement), so every
--      decision type goes through one real, auditable function instead of
--      an ad-hoc write from the app layer.
--
-- Design notes (see session investigation):
--   - support_disputes.claim_amount / customer_id are officer-entered /
--     denormalized display fields and are NEVER trusted as the posting
--     amount or identity source. The function re-derives the real
--     customer_transactions row (by transaction_reference, which is the
--     only real link - there is no FK between support_disputes and
--     customer_transactions) and posts against ITS amount/fee/currency and
--     the wallet/org that transaction actually belongs to.
--   - customer_transactions never reaches 'SUCCESSFUL' or 'FAILED' in the
--     current live code path (confirmed: only merchant-collection functions
--     transition to SUCCESSFUL). Refund/reversal must not require a
--     'SUCCESSFUL' precondition - it accepts any status that is not
--     already 'REVERSED', since the debit already happened at initiation
--     (the "honest pending provider" pattern).
--   - Funds are credited back from the same clearing account the original
--     transfer's offsetting leg would have used (transfer_clearing_accounts,
--     keyed by org_id + currency), falling back to that currency's
--     SUSPENSE-<CCY> account if no clearing account row exists for the
--     org, so the function never silently fails to balance.
--   - The underlying transaction is marked 'REVERSED' for a full
--     refund/reversal. A PARTIAL_REFUND leaves the transaction's own status
--     untouched (the transfer itself is still pending/unresolved) but
--     posts a real partial credit, capped at amount+fee, referenced by its
--     own ledger transaction.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.post_dispute_resolution(
  p_dispute_id UUID,
  p_decision_type VARCHAR(32),
  p_officer_id UUID,
  p_reason TEXT,
  p_partial_amount NUMERIC(24,2) DEFAULT NULL
)
RETURNS TABLE (
  recovery_reference VARCHAR(64),
  posted_amount NUMERIC(24,2),
  posted_currency VARCHAR(3),
  new_wallet_balance NUMERIC(24,2),
  transaction_status VARCHAR(32)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute RECORD;
  v_txn RECORD;
  v_wallet RECORD;
  v_clearing_account_id UUID;
  v_post_amount NUMERIC(24,2);
  v_ledger_tx_id UUID;
  v_recovery_ref VARCHAR(64);
BEGIN
  IF p_decision_type NOT IN ('REFUND_APPROVED', 'REVERSAL_APPROVED', 'PARTIAL_REFUND') THEN
    RAISE EXCEPTION 'post_dispute_resolution called for non-financial decision type: %', p_decision_type
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Lock the dispute row so two concurrent decisions cannot double-post.
  SELECT * INTO v_dispute
  FROM public.support_disputes
  WHERE id = p_dispute_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute % not found', p_dispute_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_dispute.decision_type IS NOT NULL THEN
    RAISE EXCEPTION 'Dispute % already has a recorded decision (%), refusing to post again',
      p_dispute_id, v_dispute.decision_type USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  -- Re-derive the real transaction; never trust support_disputes.claim_amount.
  SELECT * INTO v_txn
  FROM public.customer_transactions
  WHERE reference = v_dispute.transaction_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No customer_transactions row found for reference % referenced by dispute %',
      v_dispute.transaction_reference, p_dispute_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_txn.status = 'REVERSED' THEN
    RAISE EXCEPTION 'Transaction % has already been reversed - refusing duplicate reversal',
      v_txn.reference USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  -- Determine posting amount: full amount+fee, or a capped officer-entered
  -- partial amount. Never exceed what the customer was actually charged.
  IF p_decision_type = 'PARTIAL_REFUND' THEN
    IF p_partial_amount IS NULL OR p_partial_amount <= 0 THEN
      RAISE EXCEPTION 'PARTIAL_REFUND requires a positive p_partial_amount'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF p_partial_amount > (v_txn.amount + v_txn.fee) THEN
      RAISE EXCEPTION 'Partial refund amount % exceeds transaction total % (amount+fee)',
        p_partial_amount, (v_txn.amount + v_txn.fee) USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_post_amount := p_partial_amount;
  ELSE
    v_post_amount := v_txn.amount + v_txn.fee;
  END IF;

  -- Lock the customer's wallet.
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE id = v_txn.wallet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet % (from transaction %) not found', v_txn.wallet_id, v_txn.reference
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_wallet.ledger_account_id IS NULL THEN
    RAISE EXCEPTION 'Wallet % has no provisioned ledger account - cannot post reversal', v_wallet.id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- customer_transactions has no org_id column - the org is derived from
  -- the wallet it belongs to (matching how post_customer_transfer scopes
  -- the original debit's clearing account by wallet org).
  -- Find the clearing account this org/currency's transfers settle through.
  SELECT ledger_account_id INTO v_clearing_account_id
  FROM public.transfer_clearing_accounts
  WHERE org_id = v_wallet.org_id AND currency = v_txn.currency;

  -- Fall back to that currency's platform suspense account if no clearing
  -- mapping exists for this org, so the reversal always has a real,
  -- balanced counter-leg.
  IF v_clearing_account_id IS NULL THEN
    SELECT id INTO v_clearing_account_id
    FROM public.ledger_accounts
    WHERE currency = v_txn.currency
      AND account_number = 'SUSPENSE-' || v_txn.currency
    LIMIT 1;
  END IF;

  IF v_clearing_account_id IS NULL THEN
    RAISE EXCEPTION 'No clearing or suspense account found for org % currency % - cannot post a balanced reversal',
      v_wallet.org_id, v_txn.currency USING ERRCODE = 'no_data_found';
  END IF;

  -- Lock both ledger accounts in a stable order to avoid deadlocks.
  PERFORM 1 FROM public.ledger_accounts
    WHERE id IN (v_wallet.ledger_account_id, v_clearing_account_id)
    ORDER BY id FOR UPDATE;

  v_recovery_ref := 'DRC-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

  -- Balanced double-entry journal: debit clearing/suspense, credit customer wallet.
  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (
    v_wallet.org_id, v_recovery_ref,
    format('Dispute resolution (%s) for transaction %s: %s', p_decision_type, v_txn.reference, COALESCE(NULLIF(p_reason, ''), 'no reason provided')),
    v_post_amount, v_txn.currency, 'COMMITTED'
  )
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_clearing_account_id, 'DEBIT', v_post_amount, v_txn.currency,
      format('Dispute resolution: clearing debited to fund customer reversal for %s', v_txn.reference)),
    (v_ledger_tx_id, v_wallet.ledger_account_id, 'CREDIT', v_post_amount, v_txn.currency,
      format('Dispute resolution: wallet credited (%s) for transaction %s', p_decision_type, v_txn.reference));

  UPDATE public.ledger_accounts SET balance = balance - v_post_amount, updated_at = NOW() WHERE id = v_clearing_account_id;
  UPDATE public.ledger_accounts SET balance = balance + v_post_amount, updated_at = NOW() WHERE id = v_wallet.ledger_account_id;

  UPDATE public.wallets
  SET balance = balance + v_post_amount, updated_at = NOW()
  WHERE id = v_wallet.id;

  -- Full refund/reversal marks the underlying transaction REVERSED; a
  -- partial refund leaves the original transaction status untouched (the
  -- customer still has an unresolved balance on it) but records the
  -- partial credit against it via the ledger transaction reference.
  IF p_decision_type IN ('REFUND_APPROVED', 'REVERSAL_APPROVED') THEN
    UPDATE public.customer_transactions
    SET status = 'REVERSED', completed_at = NOW()
    WHERE id = v_txn.id;
  END IF;

  UPDATE public.support_disputes
  SET decision_type = p_decision_type,
      decided_by_officer_id = p_officer_id,
      decision_reason = p_reason,
      decided_at = NOW(),
      recovery_case_reference = v_recovery_ref,
      status = 'DECISION',
      updated_at = NOW()
  WHERE id = p_dispute_id;

  RETURN QUERY SELECT v_recovery_ref, v_post_amount, v_txn.currency,
    (SELECT balance FROM public.wallets WHERE id = v_wallet.id),
    (SELECT status FROM public.customer_transactions WHERE id = v_txn.id);
END;
$$;

COMMENT ON FUNCTION public.post_dispute_resolution IS
  'Real double-entry posting for dispute refund/reversal decisions. Replaces the prior fake in-memory DisputeChargebackEngine recording. Re-derives amount/currency/wallet from customer_transactions (never trusts support_disputes.claim_amount as authoritative). Debits the org''s transfer clearing account (falling back to SUSPENSE-<CCY>) and credits the customer wallet + its linked ledger account, then marks the dispute DECISION and (for full refund/reversal) the transaction REVERSED.';

-- Non-financial decisions (REJECTED / UNDER_INVESTIGATION) still need a
-- plain status-update path with the same idempotency guard, so the app
-- layer has one real function per decision type instead of writing
-- support_disputes directly (which would risk re-introducing an ad-hoc
-- write path). No money movement here.
CREATE OR REPLACE FUNCTION public.record_dispute_non_financial_decision(
  p_dispute_id UUID,
  p_decision_type VARCHAR(32),
  p_officer_id UUID,
  p_reason TEXT
)
RETURNS public.support_disputes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.support_disputes;
BEGIN
  IF p_decision_type NOT IN ('REJECTED', 'UNDER_INVESTIGATION') THEN
    RAISE EXCEPTION 'record_dispute_non_financial_decision called for financial decision type: %', p_decision_type
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_row FROM public.support_disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute % not found', p_dispute_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_row.decision_type IS NOT NULL THEN
    RAISE EXCEPTION 'Dispute % already has a recorded decision (%)', p_dispute_id, v_row.decision_type
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  UPDATE public.support_disputes
  SET decision_type = p_decision_type,
      decided_by_officer_id = p_officer_id,
      decision_reason = p_reason,
      decided_at = NOW(),
      status = CASE WHEN p_decision_type = 'REJECTED' THEN 'RESOLVED' ELSE 'UNDER_REVIEW' END,
      updated_at = NOW()
  WHERE id = p_dispute_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.record_dispute_non_financial_decision IS
  'Real status-update path for REJECTED / UNDER_INVESTIGATION dispute decisions (no money movement). Companion to post_dispute_resolution for financial decisions.';

REVOKE ALL ON FUNCTION public.post_dispute_resolution(UUID, VARCHAR, UUID, TEXT, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_dispute_non_financial_decision(UUID, VARCHAR, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_dispute_resolution(UUID, VARCHAR, UUID, TEXT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_dispute_non_financial_decision(UUID, VARCHAR, UUID, TEXT) TO service_role;
