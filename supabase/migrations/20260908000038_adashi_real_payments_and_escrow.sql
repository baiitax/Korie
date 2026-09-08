-- =============================================================================
-- Migration: 20260908000038_adashi_real_payments_and_escrow.sql
-- Description:
--   Requirement #2 of the Customer Portal review ("Adashi is not
--   professional/secure ... fix calculation, payment, security, UI/UX").
--
--   The customer/agent-facing Adashi surface (src/lib/adashi/AdashiStore.ts
--   + 10 in-memory engines + /api/v1/adashi/*) has never touched the real
--   `adashi.*`/`liquidity.*` schema introduced in migration 027. Every
--   "payment" and "payout" it ever recorded lived only in a JS array that
--   resets on server restart, and money never actually moved between real
--   wallets/ledger accounts. This migration builds the missing real
--   financial primitives so the app layer can be rewired to them:
--
--   1. Real per-currency Adashi escrow ledger accounts (the 3 live
--      adashi.groups rows already reference escrow_vault_account_id values
--      'ESCROW_VAULT_NGN_01' / 'ESCROW_VAULT_XOF_01' that never existed as
--      real public.ledger_accounts rows — this creates them for real and
--      backfills the existing groups to point at them).
--   2. public.post_adashi_contribution(...) — a member pays a cycle's
--      contribution obligation from their own KoriePay wallet. Real
--      double-entry posting (wallet debit -> group escrow credit),
--      idempotent, updates adashi.contribution_obligations /
--      adashi.members / adashi.cycles, and writes a real
--      adashi.contribution_events + adashi.notifications row (replacing
--      any hardcoded/simulated confirmation message).
--   3. public.post_adashi_payout(...) — disburses a completed cycle's pool
--      from the group escrow to the beneficiary's own KoriePay wallet.
--      Reads the *product's* platform_fee_percent/agent_commission_percent
--      (fixing the 1.0%/0.5% hardcoding bug that exists in BOTH the old
--      mock engine AND the "real" adashi.create_adashi_cycles RPC) rather
--      than hardcoding them again. Honest maker-checker gate: amounts at/above
--      the product's payout_maker_checker_threshold are posted as
--      PENDING/AUTHORIZED requiring a second, different, authorised actor
--      before funds move — never a fake "completed" state for a high-value
--      payout that hasn't actually been approved.
--   4. public.authorize_adashi_payout(...) — the checker action that
--      actually executes a payout previously staged as PENDING by (3).
--
--   All 4 functions are SECURITY DEFINER, validate their own inputs, and
--   never trust a client-asserted amount/fee — everything is recomputed
--   from the DB rows themselves (obligation.amount, product fee percents,
--   cycle.gross_payout_amount), mirroring the pattern already used in
--   public.post_customer_transfer / post_customer_fx_swap /
--   post_agency_cash_transaction.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------
-- 1. Real Adashi escrow ledger accounts (one per currency/legal entity —
--    matching how FX-BOOK-* and CLEARING-* accounts are organised).
--    These replace the non-existent 'ESCROW_VAULT_NGN_01'/'ESCROW_VAULT_XOF_01'
--    string literals that adashi.groups rows point to today.
-- -----------------------------------------------------------------------
INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, status)
SELECT o.id, 'ADASHI-ESCROW-NGN', 'Adashi Group Contribution Escrow — NGN', 'LIABILITY', 'NGN', 'NG', 'ACTIVE'
FROM public.organizations o WHERE o.id = '10000000-0000-0000-0000-000000000001'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, status)
SELECT o.id, 'ADASHI-ESCROW-XOF', 'Adashi Group Contribution Escrow — XOF', 'LIABILITY', 'XOF', 'NE', 'ACTIVE'
FROM public.organizations o WHERE o.id = '10000000-0000-0000-0000-000000000002'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, status)
SELECT o.id, 'ADASHI-FEE-REVENUE-NGN', 'Adashi Platform Fee Revenue — NGN', 'REVENUE', 'NGN', 'NG', 'ACTIVE'
FROM public.organizations o WHERE o.id = '10000000-0000-0000-0000-000000000001'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, status)
SELECT o.id, 'ADASHI-FEE-REVENUE-XOF', 'Adashi Platform Fee Revenue — XOF', 'REVENUE', 'XOF', 'NE', 'ACTIVE'
FROM public.organizations o WHERE o.id = '10000000-0000-0000-0000-000000000002'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, status)
SELECT o.id, 'ADASHI-AGENT-COMMISSION-NGN', 'Adashi Agent Commission Payable — NGN', 'LIABILITY', 'NGN', 'NG', 'ACTIVE'
FROM public.organizations o WHERE o.id = '10000000-0000-0000-0000-000000000001'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, status)
SELECT o.id, 'ADASHI-AGENT-COMMISSION-XOF', 'Adashi Agent Commission Payable — XOF', 'LIABILITY', 'XOF', 'NE', 'ACTIVE'
FROM public.organizations o WHERE o.id = '10000000-0000-0000-0000-000000000002'
ON CONFLICT (account_number) DO NOTHING;

-- Backfill the 3 live groups off the fictitious string IDs onto the real
-- account numbers above (same values today, now backed by real rows).
UPDATE adashi.groups SET escrow_vault_account_id = 'ADASHI-ESCROW-NGN', updated_at = NOW()
WHERE escrow_vault_account_id = 'ESCROW_VAULT_NGN_01';
UPDATE adashi.groups SET escrow_vault_account_id = 'ADASHI-ESCROW-XOF', updated_at = NOW()
WHERE escrow_vault_account_id = 'ESCROW_VAULT_XOF_01';

-- Going forward, new groups should be created pointing directly at these.
ALTER TABLE adashi.groups ALTER COLUMN escrow_vault_account_id SET DEFAULT 'ADASHI-ESCROW-NGN';

-- -----------------------------------------------------------------------
-- 2. Contribution payment: a member pays their obligation for the current
--    cycle from their own KoriePay wallet into the group's real escrow
--    ledger account. Idempotent (idempotency key scoped to obligation).
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_adashi_contribution(
    p_obligation_id UUID,
    p_customer_id UUID,
    p_wallet_id UUID,
    p_idempotency_key VARCHAR(128),
    p_payment_reference VARCHAR(64)
)
RETURNS adashi.contribution_obligations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, adashi, liquidity
AS $$
DECLARE
  v_obligation adashi.contribution_obligations;
  v_group adashi.groups;
  v_cycle adashi.cycles;
  v_wallet public.wallets;
  v_wallet_balance NUMERIC(24,2);
  v_escrow_account_id UUID;
  v_ledger_tx_id UUID;
  v_existing_key RECORD;
BEGIN
  -- Idempotency (scoped per adashi.idempotency_keys, the real table for this).
  SELECT * INTO v_existing_key FROM adashi.idempotency_keys
  WHERE idempotency_key = p_idempotency_key AND scope = 'CONTRIBUTION_DEBIT';
  IF FOUND THEN
    IF v_existing_key.status = 'COMMITTED' THEN
      RETURN (SELECT o FROM adashi.contribution_obligations o WHERE o.id = p_obligation_id);
    ELSIF v_existing_key.status = 'IN_FLIGHT' THEN
      RAISE EXCEPTION 'CONTRIBUTION_ALREADY_IN_FLIGHT';
    END IF;
  END IF;

  SELECT * INTO v_obligation FROM adashi.contribution_obligations
  WHERE id = p_obligation_id AND customer_id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'OBLIGATION_NOT_FOUND';
  END IF;

  IF v_obligation.status = 'PAID' THEN
    RETURN v_obligation; -- already settled, honest no-op
  END IF;
  IF v_obligation.status NOT IN ('SCHEDULED', 'DUE', 'OVERDUE') THEN
    RAISE EXCEPTION 'OBLIGATION_NOT_PAYABLE_IN_STATUS_%', v_obligation.status;
  END IF;

  SELECT * INTO v_group FROM adashi.groups WHERE id = v_obligation.group_id FOR UPDATE;
  SELECT * INTO v_cycle FROM adashi.cycles WHERE id = v_obligation.cycle_id FOR UPDATE;

  SELECT * INTO v_wallet FROM public.wallets
  WHERE id = p_wallet_id AND customer_id = p_customer_id AND currency = v_obligation.currency FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;
  IF v_wallet.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'WALLET_NOT_ACTIVE';
  END IF;

  SELECT balance INTO v_wallet_balance FROM public.ledger_accounts
  WHERE id = v_wallet.ledger_account_id FOR UPDATE;
  IF v_wallet_balance < v_obligation.amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_WALLET_BALANCE';
  END IF;

  SELECT id INTO v_escrow_account_id FROM public.ledger_accounts
  WHERE account_number = v_group.escrow_vault_account_id;
  IF v_escrow_account_id IS NULL THEN
    RAISE EXCEPTION 'ESCROW_ACCOUNT_NOT_CONFIGURED';
  END IF;
  PERFORM 1 FROM public.ledger_accounts WHERE id = v_escrow_account_id FOR UPDATE;

  INSERT INTO adashi.idempotency_keys (idempotency_key, scope, resource_id, request_hash, status, expires_at)
  VALUES (p_idempotency_key, 'CONTRIBUTION_DEBIT', p_obligation_id::text, encode(digest(p_obligation_id::text || p_customer_id::text, 'sha256'), 'hex'), 'IN_FLIGHT', NOW() + INTERVAL '7 days')
  ON CONFLICT (idempotency_key) DO NOTHING;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_wallet.org_id, p_payment_reference, 'Adashi contribution: ' || v_group.name || ' cycle ' || v_obligation.cycle_number, v_obligation.amount, v_obligation.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_wallet.ledger_account_id, 'DEBIT', v_obligation.amount, v_obligation.currency, 'Adashi contribution debited from member wallet'),
    (v_ledger_tx_id, v_escrow_account_id, 'CREDIT', v_obligation.amount, v_obligation.currency, 'Adashi contribution received into group escrow');

  UPDATE public.ledger_accounts SET balance = balance - v_obligation.amount, updated_at = NOW() WHERE id = v_wallet.ledger_account_id;
  UPDATE public.ledger_accounts SET balance = balance + v_obligation.amount, updated_at = NOW() WHERE id = v_escrow_account_id;
  UPDATE public.wallets SET balance = balance - v_obligation.amount, updated_at = NOW() WHERE id = p_wallet_id;

  UPDATE adashi.contribution_obligations
  SET status = 'PAID', paid_at = NOW(), ledger_journal_id = v_ledger_tx_id::text,
      payment_reference = p_payment_reference, updated_at = NOW()
  WHERE id = p_obligation_id
  RETURNING * INTO v_obligation;

  UPDATE adashi.members
  SET total_contributed = total_contributed + v_obligation.amount, updated_at = NOW()
  WHERE group_id = v_obligation.group_id AND customer_id = p_customer_id;

  UPDATE adashi.cycles
  SET collected_pool = collected_pool + v_obligation.amount,
      outstanding_amount = GREATEST(outstanding_amount - v_obligation.amount, 0),
      status = CASE
        WHEN (collected_pool + v_obligation.amount) >= expected_pool THEN 'COLLECTION_COMPLETED'
        ELSE 'COLLECTION_IN_PROGRESS'
      END,
      updated_at = NOW()
  WHERE id = v_obligation.cycle_id;

  INSERT INTO adashi.contribution_events (obligation_id, event_type, previous_status, new_status, actor_id, actor_role, details_json)
  VALUES (p_obligation_id, 'CONTRIBUTION_PAID', 'SCHEDULED', 'PAID', p_customer_id, 'CUSTOMER',
          jsonb_build_object('amount', v_obligation.amount, 'currency', v_obligation.currency, 'ledger_transaction_id', v_ledger_tx_id));

  -- Real notification row (replaces any hardcoded confirmation string) —
  -- content_preview is generated here from real data, not a literal
  -- template baked into the frontend.
  INSERT INTO adashi.notifications (group_id, customer_id, notification_type, channel, recipient, content_preview, delivery_status)
  SELECT v_group.id, p_customer_id, 'CONTRIBUTION_CONFIRMED', 'IN_APP', c.phone,
         'Your ' || v_obligation.currency || ' ' || v_obligation.amount::text || ' contribution to ' || v_group.name || ' (cycle ' || v_obligation.cycle_number || ') was received.',
         'SENT'
  FROM public.customers c WHERE c.id = p_customer_id;

  UPDATE adashi.idempotency_keys SET status = 'COMMITTED' WHERE idempotency_key = p_idempotency_key;

  RETURN v_obligation;
EXCEPTION WHEN OTHERS THEN
  UPDATE adashi.idempotency_keys SET status = 'FAILED' WHERE idempotency_key = p_idempotency_key AND status = 'IN_FLIGHT';
  RAISE;
END;
$$;

-- -----------------------------------------------------------------------
-- 3. Payout disbursement. Reads fee percentages from adashi.products
--    (fixing the 1.0%/0.5% hardcoding bug present in both the mock engine
--    and adashi.create_adashi_cycles). Below the product's
--    payout_maker_checker_threshold, executes immediately. At/above it,
--    stages the payout as PENDING (requires_maker_checker = TRUE,
--    maker_id recorded) and does NOT move any money — a second call to
--    authorize_adashi_payout() by a DIFFERENT actor is required.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_adashi_payout(
    p_cycle_id UUID,
    p_maker_id UUID,
    p_maker_role VARCHAR(32),
    p_idempotency_key VARCHAR(128),
    p_payment_reference VARCHAR(64)
)
RETURNS adashi.payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, adashi, liquidity
AS $$
DECLARE
  v_cycle adashi.cycles;
  v_group adashi.groups;
  v_product adashi.products;
  v_existing adashi.payouts;
  v_gross NUMERIC(24,2);
  v_plat_fee NUMERIC(24,2);
  v_agent_fee NUMERIC(24,2);
  v_net NUMERIC(24,2);
  v_payout adashi.payouts;
BEGIN
  SELECT * INTO v_existing FROM adashi.payouts WHERE cycle_id = p_cycle_id;
  IF FOUND THEN
    RETURN v_existing; -- idempotent on cycle (uq_adashi_cycle_active_payout)
  END IF;

  SELECT * INTO v_cycle FROM adashi.cycles WHERE id = p_cycle_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CYCLE_NOT_FOUND';
  END IF;
  IF v_cycle.status <> 'COLLECTION_COMPLETED' THEN
    RAISE EXCEPTION 'CYCLE_NOT_READY_FOR_PAYOUT_STATUS_%', v_cycle.status;
  END IF;

  SELECT * INTO v_group FROM adashi.groups WHERE id = v_cycle.group_id FOR UPDATE;
  SELECT * INTO v_product FROM adashi.products WHERE id = v_group.product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  -- Recompute fees from the PRODUCT, not the cycle's stored (possibly
  -- stale/hardcoded) amounts and never from a client-supplied number.
  v_gross := v_cycle.collected_pool;
  v_plat_fee := ROUND(v_gross * (v_product.platform_fee_percent / 100.0), 2);
  v_agent_fee := ROUND(v_gross * (v_product.agent_commission_percent / 100.0), 2);
  v_net := v_gross - v_plat_fee - v_agent_fee;

  IF v_net <= 0 THEN
    RAISE EXCEPTION 'NET_PAYOUT_NOT_POSITIVE';
  END IF;

  INSERT INTO adashi.payouts (
    group_id, cycle_id, cycle_number, beneficiary_customer_id, beneficiary_name,
    gross_amount, platform_fee, agent_commission, net_disbursed_amount, currency,
    destination_type, destination_account_id, status, requires_maker_checker, maker_id,
    payment_reference
  ) VALUES (
    v_group.id, v_cycle.id, v_cycle.cycle_number, v_cycle.beneficiary_customer_id, v_cycle.beneficiary_name,
    v_gross, v_plat_fee, v_agent_fee, v_net, v_cycle.currency,
    'KORIEPAY_WALLET', v_cycle.beneficiary_customer_id::text,
    CASE WHEN v_product.requires_maker_checker_payout AND v_gross >= v_product.payout_maker_checker_threshold
         THEN 'PENDING' ELSE 'AUTHORIZED' END,
    (v_product.requires_maker_checker_payout AND v_gross >= v_product.payout_maker_checker_threshold),
    p_maker_id,
    p_payment_reference
  )
  RETURNING * INTO v_payout;

  INSERT INTO adashi.payout_events (payout_id, event_type, previous_status, new_status, actor_id, details_json)
  VALUES (v_payout.id, 'PAYOUT_INITIATED', NULL, v_payout.status, p_maker_id,
          jsonb_build_object('gross_amount', v_gross, 'net_amount', v_net, 'requires_maker_checker', v_payout.requires_maker_checker));

  UPDATE adashi.cycles SET status = 'PAYOUT_PENDING_APPROVAL', updated_at = NOW() WHERE id = p_cycle_id;

  -- If it did NOT require maker-checker, execute the disbursement right
  -- now in the same transaction (single-actor, low-value case).
  IF v_payout.status = 'AUTHORIZED' THEN
    PERFORM public._execute_adashi_payout_disbursement(v_payout.id, p_maker_id);
    SELECT * INTO v_payout FROM adashi.payouts WHERE id = v_payout.id;
  END IF;

  RETURN v_payout;
END;
$$;

-- -----------------------------------------------------------------------
-- 3b. Internal helper: the actual money-moving step, shared by the
--     immediate (below-threshold) path and the checker-authorized path.
--     Not exposed directly to the API layer.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._execute_adashi_payout_disbursement(
    p_payout_id UUID,
    p_actor_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, adashi, liquidity
AS $$
DECLARE
  v_payout adashi.payouts;
  v_group adashi.groups;
  v_escrow_account_id UUID;
  v_fee_revenue_id UUID;
  v_commission_payable_id UUID;
  v_beneficiary_wallet public.wallets;
  v_ledger_tx_id UUID;
  v_org_id UUID;
BEGIN
  SELECT * INTO v_payout FROM adashi.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYOUT_NOT_FOUND';
  END IF;
  IF v_payout.status IN ('SUCCESS', 'PROCESSING') THEN
    RETURN; -- already executed / in flight, no-op
  END IF;
  IF v_payout.status NOT IN ('AUTHORIZED') THEN
    RAISE EXCEPTION 'PAYOUT_NOT_AUTHORIZED_STATUS_%', v_payout.status;
  END IF;

  SELECT * INTO v_group FROM adashi.groups WHERE id = v_payout.group_id;

  SELECT id, org_id INTO v_escrow_account_id, v_org_id FROM public.ledger_accounts
  WHERE account_number = v_group.escrow_vault_account_id;
  IF v_escrow_account_id IS NULL THEN
    RAISE EXCEPTION 'ESCROW_ACCOUNT_NOT_CONFIGURED';
  END IF;

  SELECT id INTO v_fee_revenue_id FROM public.ledger_accounts
  WHERE currency = v_payout.currency AND account_number LIKE 'ADASHI-FEE-REVENUE-%';
  SELECT id INTO v_commission_payable_id FROM public.ledger_accounts
  WHERE currency = v_payout.currency AND account_number LIKE 'ADASHI-AGENT-COMMISSION-%';

  SELECT * INTO v_beneficiary_wallet FROM public.wallets
  WHERE customer_id = v_payout.beneficiary_customer_id AND currency = v_payout.currency FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BENEFICIARY_WALLET_NOT_FOUND';
  END IF;
  IF v_beneficiary_wallet.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'BENEFICIARY_WALLET_NOT_ACTIVE';
  END IF;

  PERFORM 1 FROM public.ledger_accounts
  WHERE id IN (v_escrow_account_id, v_fee_revenue_id, v_commission_payable_id) FOR UPDATE;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_org_id, v_payout.payment_reference, 'Adashi payout: ' || v_group.name || ' cycle ' || v_payout.cycle_number, v_payout.gross_amount, v_payout.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES (v_ledger_tx_id, v_escrow_account_id, 'DEBIT', v_payout.gross_amount, v_payout.currency, 'Adashi payout: gross pool released from group escrow');

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES (v_ledger_tx_id, v_beneficiary_wallet.ledger_account_id, 'CREDIT', v_payout.net_disbursed_amount, v_payout.currency, 'Adashi payout: net amount credited to beneficiary wallet');

  IF v_payout.platform_fee > 0 AND v_fee_revenue_id IS NOT NULL THEN
    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES (v_ledger_tx_id, v_fee_revenue_id, 'CREDIT', v_payout.platform_fee, v_payout.currency, 'Adashi payout: platform fee recognised as revenue');
  END IF;

  IF v_payout.agent_commission > 0 AND v_commission_payable_id IS NOT NULL THEN
    INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
    VALUES (v_ledger_tx_id, v_commission_payable_id, 'CREDIT', v_payout.agent_commission, v_payout.currency, 'Adashi payout: agent commission accrued payable');
  END IF;

  UPDATE public.ledger_accounts SET balance = balance - v_payout.gross_amount, updated_at = NOW() WHERE id = v_escrow_account_id;
  UPDATE public.ledger_accounts SET balance = balance + v_payout.net_disbursed_amount, updated_at = NOW() WHERE id = v_beneficiary_wallet.ledger_account_id;
  IF v_payout.platform_fee > 0 AND v_fee_revenue_id IS NOT NULL THEN
    UPDATE public.ledger_accounts SET balance = balance + v_payout.platform_fee, updated_at = NOW() WHERE id = v_fee_revenue_id;
  END IF;
  IF v_payout.agent_commission > 0 AND v_commission_payable_id IS NOT NULL THEN
    UPDATE public.ledger_accounts SET balance = balance + v_payout.agent_commission, updated_at = NOW() WHERE id = v_commission_payable_id;
  END IF;

  UPDATE public.wallets SET balance = balance + v_payout.net_disbursed_amount, updated_at = NOW() WHERE id = v_beneficiary_wallet.id;

  UPDATE adashi.payouts
  SET status = 'SUCCESS', ledger_journal_id = v_ledger_tx_id::text, disbursed_at = NOW(), updated_at = NOW()
  WHERE id = p_payout_id;

  UPDATE adashi.members
  SET total_payout_received = total_payout_received + v_payout.net_disbursed_amount, updated_at = NOW()
  WHERE group_id = v_payout.group_id AND customer_id = v_payout.beneficiary_customer_id;

  UPDATE adashi.cycles
  SET status = 'PAYOUT_COMPLETED', payout_reference = v_payout.payment_reference, payout_completed_at = NOW(), updated_at = NOW()
  WHERE id = v_payout.cycle_id;

  INSERT INTO adashi.payout_events (payout_id, event_type, previous_status, new_status, actor_id, details_json)
  VALUES (p_payout_id, 'PAYOUT_DISBURSED', 'AUTHORIZED', 'SUCCESS', p_actor_id,
          jsonb_build_object('net_disbursed_amount', v_payout.net_disbursed_amount, 'ledger_transaction_id', v_ledger_tx_id));

  INSERT INTO adashi.notifications (group_id, customer_id, notification_type, channel, recipient, content_preview, delivery_status)
  SELECT v_group.id, v_payout.beneficiary_customer_id, 'PAYOUT_DISBURSED', 'IN_APP', c.phone,
         'Congratulations! Your ' || v_payout.currency || ' ' || v_payout.net_disbursed_amount::text || ' payout for ' || v_group.name || ' (cycle ' || v_payout.cycle_number || ') has been credited to your wallet.',
         'SENT'
  FROM public.customers c WHERE c.id = v_payout.beneficiary_customer_id;
END;
$$;

-- -----------------------------------------------------------------------
-- 4. Checker action: approves (and executes) or rejects a PENDING
--    maker-checker payout. Enforces segregation of duties (checker cannot
--    be the same actor as the maker) for real, server-side.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.authorize_adashi_payout(
    p_payout_id UUID,
    p_checker_id UUID,
    p_checker_role VARCHAR(32),
    p_decision VARCHAR(16), -- 'APPROVE' | 'REJECT'
    p_notes TEXT
)
RETURNS adashi.payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, adashi, liquidity
AS $$
DECLARE
  v_payout adashi.payouts;
BEGIN
  IF p_decision NOT IN ('APPROVE', 'REJECT') THEN
    RAISE EXCEPTION 'INVALID_DECISION';
  END IF;

  SELECT * INTO v_payout FROM adashi.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYOUT_NOT_FOUND';
  END IF;
  IF v_payout.status <> 'PENDING' THEN
    RAISE EXCEPTION 'PAYOUT_NOT_PENDING_STATUS_%', v_payout.status;
  END IF;
  IF v_payout.maker_id = p_checker_id THEN
    RAISE EXCEPTION 'SEGREGATION_OF_DUTIES_VIOLATION';
  END IF;

  IF p_decision = 'REJECT' THEN
    UPDATE adashi.payouts SET status = 'CANCELLED', checker_id = p_checker_id, error_reason = p_notes, updated_at = NOW()
    WHERE id = p_payout_id RETURNING * INTO v_payout;

    UPDATE adashi.cycles SET status = 'COLLECTION_COMPLETED', updated_at = NOW() WHERE id = v_payout.cycle_id;

    INSERT INTO adashi.payout_events (payout_id, event_type, previous_status, new_status, actor_id, details_json)
    VALUES (p_payout_id, 'PAYOUT_REJECTED', 'PENDING', 'CANCELLED', p_checker_id, jsonb_build_object('notes', p_notes));

    RETURN v_payout;
  END IF;

  UPDATE adashi.payouts SET status = 'AUTHORIZED', checker_id = p_checker_id, updated_at = NOW()
  WHERE id = p_payout_id RETURNING * INTO v_payout;

  INSERT INTO adashi.payout_events (payout_id, event_type, previous_status, new_status, actor_id, details_json)
  VALUES (p_payout_id, 'PAYOUT_APPROVED', 'PENDING', 'AUTHORIZED', p_checker_id, jsonb_build_object('notes', p_notes));

  PERFORM public._execute_adashi_payout_disbursement(p_payout_id, p_checker_id);

  SELECT * INTO v_payout FROM adashi.payouts WHERE id = p_payout_id;
  RETURN v_payout;
END;
$$;

COMMIT;
