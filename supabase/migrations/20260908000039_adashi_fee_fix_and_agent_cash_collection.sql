-- =============================================================================
-- Migration: 20260908000039_adashi_fee_fix_and_agent_cash_collection.sql
-- Description:
--   1. Fixes adashi.create_adashi_cycles(): it hardcoded platform fee =
--      1.0% / agent commission = 0.5% inline instead of reading them from
--      the group's actual adashi.products row — the exact same bug
--      independently confirmed in the (now-replaced) mock
--      AdashiGroupLifecycleEngine.startGroup(). A group created from a
--      product with different fee percentages (e.g. ADA-NGN-MO-50K at
--      1.5%/0.5%, or ADA-XOF-MO-25K at 1.25%/0.5%) was silently charged
--      the wrong fee on every cycle's displayed figures. This does not
--      retroactively fix already-created cycles' stored (possibly wrong)
--      fee estimates — those are cosmetic pre-payout previews only, since
--      public.post_adashi_payout() (migration 038) always recomputes the
--      real fee from the product at actual disbursement time — but new
--      cycles from here on show the correct number from the start.
--   2. Adds public.post_adashi_contribution_agent_collect(): the honest
--      real-money path for an agent who physically collects cash from a
--      group member and settles their contribution obligation on their
--      behalf (the "AGENT_CASH_COLLECTED" payment method referenced by the
--      agent portal UI). Real double-entry: debits the agent's own
--      CASH_IN_HAND ledger account (they now physically hold the cash) and
--      credits the group's real escrow account — mirroring how
--      public.post_agency_cash_transaction() already books ordinary
--      agency cash-in movements.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION adashi.create_adashi_cycles(
    p_group_id UUID,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = adashi, liquidity, public
AS $$
DECLARE
    v_group RECORD;
    v_product RECORD;
    v_slot RECORD;
    v_cadence_days INT;
    v_start_date DATE;
    v_cycle_start TIMESTAMPTZ;
    v_cycle_due TIMESTAMPTZ;
    v_grace_deadline TIMESTAMPTZ;
    v_gross NUMERIC(24, 2);
    v_plat_fee NUMERIC(24, 2);
    v_agent_fee NUMERIC(24, 2);
    v_net_payout NUMERIC(24, 2);
    v_cycle_id UUID;
    v_member RECORD;
BEGIN
    SELECT * INTO v_group FROM adashi.groups WHERE id = p_group_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group % not found.', p_group_id;
    END IF;

    SELECT * INTO v_product FROM adashi.products WHERE id = v_group.product_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % for group % not found.', v_group.product_id, p_group_id;
    END IF;

    v_cadence_days := CASE v_group.frequency
        WHEN 'DAILY' THEN 1
        WHEN 'WEEKLY' THEN 7
        WHEN 'BIWEEKLY' THEN 14
        WHEN 'MONTHLY' THEN 30
        ELSE 7
    END;

    v_gross := v_group.contribution_amount * v_group.target_members;
    -- Read the ACTUAL product fee percentages instead of hardcoding them
    -- (this was the bug: previously always 1.00% / 0.50% regardless of
    -- the product's own platform_fee_percent / agent_commission_percent).
    v_plat_fee := ROUND(v_gross * (v_product.platform_fee_percent / 100.0), 2);
    v_agent_fee := ROUND(v_gross * (v_product.agent_commission_percent / 100.0), 2);
    v_net_payout := v_gross - (v_plat_fee + v_agent_fee);

    v_start_date := COALESCE(v_group.start_date, CURRENT_DATE);

    FOR v_slot IN 
        SELECT am.position, am.member_id, am.customer_id,
               COALESCE(c.first_name || ' ' || c.last_name, 'Beneficiary ' || am.position) AS customer_name
        FROM adashi.allocation_members am
        LEFT JOIN public.customers c ON c.id = am.customer_id
        WHERE am.group_id = p_group_id
        ORDER BY am.position ASC
    LOOP
        v_cycle_start := v_start_date + ((v_slot.position - 1) * v_cadence_days * INTERVAL '1 day');
        v_cycle_due := v_cycle_start + (v_cadence_days * INTERVAL '1 day');
        v_grace_deadline := v_cycle_due + (v_group.grace_period_hours * INTERVAL '1 hour');

        INSERT INTO adashi.cycles (
            group_id, cycle_number, beneficiary_member_id, beneficiary_customer_id, beneficiary_name,
            start_date, contribution_deadline, grace_deadline,
            expected_pool, collected_pool, outstanding_amount, gross_payout_amount,
            platform_fee_amount, agent_commission_amount, net_payout_amount,
            currency, status
        )
        VALUES (
            p_group_id, v_slot.position, v_slot.member_id, v_slot.customer_id, v_slot.customer_name,
            v_cycle_start::date, v_cycle_due, v_grace_deadline,
            v_gross, 0.00, v_gross, v_gross,
            v_plat_fee, v_agent_fee, v_net_payout,
            v_group.currency, CASE WHEN v_slot.position = 1 THEN 'CONTRIBUTION_OPEN' ELSE 'SCHEDULED' END
        )
        RETURNING id INTO v_cycle_id;

        IF v_slot.position = 1 THEN
            FOR v_member IN SELECT * FROM adashi.members WHERE group_id = p_group_id LOOP
                INSERT INTO adashi.contribution_obligations (
                    group_id, cycle_id, cycle_number, member_id, customer_id,
                    amount, currency, due_date, grace_deadline, status
                )
                VALUES (
                    p_group_id, v_cycle_id, 1, v_member.id, v_member.customer_id,
                    v_group.contribution_amount, v_group.currency, v_cycle_due, v_grace_deadline, 'SCHEDULED'
                );
            END LOOP;
        END IF;
    END LOOP;

    UPDATE adashi.groups
    SET status = 'ACTIVE', started_at = NOW(), current_cycle_number = 1, total_pool_volume = v_gross, updated_at = NOW()
    WHERE id = p_group_id;

    RETURN jsonb_build_object('success', TRUE, 'group_id', p_group_id, 'status', 'ACTIVE', 'cycles_created', v_group.target_members);
END;
$$;

-- -----------------------------------------------------------------------
-- Agent physical-cash contribution collection.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_adashi_contribution_agent_collect(
    p_obligation_id UUID,
    p_agent_id UUID,
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
  v_cash_hand_id UUID;
  v_cash_hand_balance NUMERIC(24,2);
  v_escrow_account_id UUID;
  v_org_id UUID;
  v_ledger_tx_id UUID;
  v_existing_key RECORD;
BEGIN
  SELECT * INTO v_existing_key FROM adashi.idempotency_keys
  WHERE idempotency_key = p_idempotency_key AND scope = 'CONTRIBUTION_DEBIT_AGENT_CASH';
  IF FOUND THEN
    IF v_existing_key.status = 'COMMITTED' THEN
      RETURN (SELECT o FROM adashi.contribution_obligations o WHERE o.id = p_obligation_id);
    ELSIF v_existing_key.status = 'IN_FLIGHT' THEN
      RAISE EXCEPTION 'CONTRIBUTION_ALREADY_IN_FLIGHT';
    END IF;
  END IF;

  SELECT * INTO v_obligation FROM adashi.contribution_obligations WHERE id = p_obligation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'OBLIGATION_NOT_FOUND';
  END IF;
  IF v_obligation.status = 'PAID' THEN
    RETURN v_obligation;
  END IF;
  IF v_obligation.status NOT IN ('SCHEDULED', 'DUE', 'OVERDUE') THEN
    RAISE EXCEPTION 'OBLIGATION_NOT_PAYABLE_IN_STATUS_%', v_obligation.status;
  END IF;

  SELECT * INTO v_group FROM adashi.groups WHERE id = v_obligation.group_id FOR UPDATE;

  -- The collecting agent must actually be assigned to this group.
  IF v_group.assigned_agent_id IS DISTINCT FROM p_agent_id THEN
    RAISE EXCEPTION 'AGENT_NOT_ASSIGNED_TO_GROUP';
  END IF;

  SELECT la.id, la.org_id, la.balance INTO v_cash_hand_id, v_org_id, v_cash_hand_balance
  FROM public.agent_float_accounts afa
  JOIN public.ledger_accounts la ON la.id = afa.ledger_account_id
  WHERE afa.agent_id = p_agent_id AND afa.account_kind = 'CASH_IN_HAND' AND afa.currency = v_obligation.currency
  FOR UPDATE OF la;

  IF v_cash_hand_id IS NULL THEN
    RAISE EXCEPTION 'AGENT_FLOAT_NOT_PROVISIONED';
  END IF;

  SELECT id INTO v_escrow_account_id FROM public.ledger_accounts
  WHERE account_number = v_group.escrow_vault_account_id;
  IF v_escrow_account_id IS NULL THEN
    RAISE EXCEPTION 'ESCROW_ACCOUNT_NOT_CONFIGURED';
  END IF;
  PERFORM 1 FROM public.ledger_accounts WHERE id = v_escrow_account_id FOR UPDATE;

  INSERT INTO adashi.idempotency_keys (idempotency_key, scope, resource_id, request_hash, status, expires_at)
  VALUES (p_idempotency_key, 'CONTRIBUTION_DEBIT_AGENT_CASH', p_obligation_id::text, encode(digest(p_obligation_id::text || p_agent_id::text, 'sha256'), 'hex'), 'IN_FLIGHT', NOW() + INTERVAL '7 days')
  ON CONFLICT (idempotency_key) DO NOTHING;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_org_id, p_payment_reference, 'Adashi contribution (agent cash collected): ' || v_group.name || ' cycle ' || v_obligation.cycle_number, v_obligation.amount, v_obligation.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  -- Agent now physically holds the customer's cash (asset increases);
  -- the group's escrow liability increases by the same amount.
  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES
    (v_ledger_tx_id, v_cash_hand_id, 'DEBIT', v_obligation.amount, v_obligation.currency, 'Adashi contribution collected as physical cash by agent'),
    (v_ledger_tx_id, v_escrow_account_id, 'CREDIT', v_obligation.amount, v_obligation.currency, 'Adashi contribution (agent-collected cash) received into group escrow');

  UPDATE public.ledger_accounts SET balance = balance + v_obligation.amount, updated_at = NOW() WHERE id = v_cash_hand_id;
  UPDATE public.ledger_accounts SET balance = balance + v_obligation.amount, updated_at = NOW() WHERE id = v_escrow_account_id;

  UPDATE adashi.contribution_obligations
  SET status = 'PAID', paid_at = NOW(), ledger_journal_id = v_ledger_tx_id::text,
      payment_reference = p_payment_reference, updated_at = NOW()
  WHERE id = p_obligation_id
  RETURNING * INTO v_obligation;

  UPDATE adashi.members
  SET total_contributed = total_contributed + v_obligation.amount, updated_at = NOW()
  WHERE group_id = v_obligation.group_id AND customer_id = v_obligation.customer_id;

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
  VALUES (p_obligation_id, 'CONTRIBUTION_PAID_AGENT_CASH', 'SCHEDULED', 'PAID', p_agent_id, 'AGENT',
          jsonb_build_object('amount', v_obligation.amount, 'currency', v_obligation.currency, 'ledger_transaction_id', v_ledger_tx_id));

  INSERT INTO adashi.notifications (group_id, customer_id, notification_type, channel, recipient, content_preview, delivery_status)
  SELECT v_group.id, v_obligation.customer_id, 'CONTRIBUTION_CONFIRMED', 'IN_APP', c.phone,
         'Your ' || v_obligation.currency || ' ' || v_obligation.amount::text || ' contribution to ' || v_group.name || ' (cycle ' || v_obligation.cycle_number || ') was collected by your agent and confirmed.',
         'SENT'
  FROM public.customers c WHERE c.id = v_obligation.customer_id;

  UPDATE adashi.idempotency_keys SET status = 'COMMITTED' WHERE idempotency_key = p_idempotency_key;

  RETURN v_obligation;
EXCEPTION WHEN OTHERS THEN
  UPDATE adashi.idempotency_keys SET status = 'FAILED' WHERE idempotency_key = p_idempotency_key AND status = 'IN_FLIGHT';
  RAISE;
END;
$$;

COMMIT;
