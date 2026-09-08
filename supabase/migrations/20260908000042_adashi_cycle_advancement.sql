-- =============================================================================
-- Migration: 20260908000042_adashi_cycle_advancement.sql
-- Description:
--   Fixes a genuine structural gap discovered live while running a real
--   5-member Adashi rotation end-to-end: adashi.create_adashi_cycles()
--   (migration 027, re-confirmed in 039) only ever creates
--   adashi.contribution_obligations rows for cycle 1 — cycles 2..N are
--   inserted as empty 'SCHEDULED' shells with no obligations rows at all.
--   Nothing in the money-movement layer (migration 038's
--   _execute_adashi_payout_disbursement) ever opened the next cycle for
--   contributions after the current cycle's payout completed. The same gap
--   existed in the original in-memory AdashiGroupLifecycleEngine.startGroup(),
--   which also only ever built cycle 1 — so this was never fixed, only
--   carried forward. Left as-is, every real Adashi circle would
--   permanently dead-end after its first payout: members 2..N would never
--   be asked to pay their next contribution and would never receive their
--   own payout.
--
--   This migration adds adashi.advance_adashi_cycle(), which:
--     1. Is invoked automatically by _execute_adashi_payout_disbursement
--        immediately after it marks the just-paid-out cycle
--        PAYOUT_COMPLETED (same transaction, so either both succeed or
--        neither does).
--     2. Looks up cycle_number + 1 for the group. If it exists, opens it
--        (status -> CONTRIBUTION_OPEN) and inserts one
--        contribution_obligations row per active member for that cycle
--        (mirroring exactly what create_adashi_cycles() does for cycle 1),
--        and advances adashi.groups.current_cycle_number.
--     3. If there is no next cycle (the just-completed cycle was the
--        group's last), marks the group COMPLETED instead — the rotation
--        is finished, every member has now received their payout exactly
--        once.
--   _execute_adashi_payout_disbursement's function body is otherwise
--   byte-for-byte identical to migration 038's version; only the two lines
--   at the very end (the PERFORM call and nothing else) are new.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION adashi.advance_adashi_cycle(
    p_group_id UUID,
    p_completed_cycle_number INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = adashi, liquidity, public, extensions
AS $$
DECLARE
    v_group adashi.groups;
    v_next_cycle adashi.cycles;
    v_member RECORD;
BEGIN
    SELECT * INTO v_group FROM adashi.groups WHERE id = p_group_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'GROUP_NOT_FOUND';
    END IF;

    SELECT * INTO v_next_cycle FROM adashi.cycles
    WHERE group_id = p_group_id AND cycle_number = p_completed_cycle_number + 1
    FOR UPDATE;

    IF NOT FOUND THEN
        -- No further cycles: the rotation is finished.
        UPDATE adashi.groups
        SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
        WHERE id = p_group_id;

        INSERT INTO adashi.group_events (group_id, event_type, previous_status, new_status, actor_id, actor_role, payload_json, correlation_id)
        VALUES (p_group_id, 'GROUP_COMPLETED', v_group.status, 'COMPLETED', p_group_id, 'SYSTEM',
                jsonb_build_object('final_cycle_number', p_completed_cycle_number), 'adashi-cycle-advance-' || p_group_id::text || '-' || p_completed_cycle_number::text);

        RETURN jsonb_build_object('success', TRUE, 'group_status', 'COMPLETED', 'next_cycle_opened', FALSE);
    END IF;

    UPDATE adashi.cycles
    SET status = 'CONTRIBUTION_OPEN', updated_at = NOW()
    WHERE id = v_next_cycle.id;

    -- One obligation per currently active member of the group — mirrors
    -- create_adashi_cycles()'s cycle-1 obligation seeding exactly.
    FOR v_member IN
        SELECT * FROM adashi.members
        WHERE group_id = p_group_id
        AND membership_status IN ('ACTIVE_LOCKED', 'CONSENT_ACCEPTED')
    LOOP
        INSERT INTO adashi.contribution_obligations (
            group_id, cycle_id, cycle_number, member_id, customer_id,
            amount, currency, due_date, grace_deadline, status
        )
        VALUES (
            p_group_id, v_next_cycle.id, v_next_cycle.cycle_number, v_member.id, v_member.customer_id,
            v_group.contribution_amount, v_group.currency, v_next_cycle.contribution_deadline, v_next_cycle.grace_deadline, 'SCHEDULED'
        )
        ON CONFLICT (group_id, cycle_id, member_id) DO NOTHING;
    END LOOP;

    UPDATE adashi.groups
    SET current_cycle_number = v_next_cycle.cycle_number, updated_at = NOW()
    WHERE id = p_group_id;

    INSERT INTO adashi.cycle_events (cycle_id, group_id, event_type, previous_status, new_status, payload_json)
    VALUES (v_next_cycle.id, p_group_id, 'CYCLE_OPENED', 'SCHEDULED', 'CONTRIBUTION_OPEN',
            jsonb_build_object('cycle_number', v_next_cycle.cycle_number, 'beneficiary_customer_id', v_next_cycle.beneficiary_customer_id));

    RETURN jsonb_build_object('success', TRUE, 'group_status', 'ACTIVE', 'next_cycle_opened', TRUE, 'cycle_number', v_next_cycle.cycle_number);
END;
$$;

-- -----------------------------------------------------------------------
-- Re-create _execute_adashi_payout_disbursement identically to migration
-- 038, adding exactly one PERFORM call right after the cycle is marked
-- PAYOUT_COMPLETED, in the same transaction.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._execute_adashi_payout_disbursement(
    p_payout_id UUID,
    p_actor_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, adashi, liquidity, extensions
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

  -- NEW: advance the rotation — open the next cycle for contributions, or
  -- mark the group COMPLETED if this was the last cycle. Same transaction
  -- as everything else above, so a failure here rolls back the whole
  -- disbursement rather than leaving the group silently stuck.
  PERFORM adashi.advance_adashi_cycle(v_payout.group_id, v_payout.cycle_number);

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

COMMIT;
