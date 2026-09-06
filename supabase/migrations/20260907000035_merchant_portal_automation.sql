-- ============================================================================
-- Merchant Portal: real backing for the last fake/hardcoded surfaces —
-- in-store collections, reconciliation, reports evidence, webhook delivery,
-- staff invites, settings persistence, support tickets, wallet payouts, and
-- a merchant-level terminal count. Every new table follows the existing
-- merchant_* RLS pattern (staff of the owning merchant can SELECT their own
-- rows; all writes happen through the service-role API routes).
-- ============================================================================

-- 1. Merchant notification preferences + basic account settings (was fully
--    fake local-state toggles with no persistence).
CREATE TABLE IF NOT EXISTS public.merchant_notification_settings (
  merchant_id     UUID PRIMARY KEY REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  email_alerts    BOOLEAN NOT NULL DEFAULT TRUE,
  sms_alerts      BOOLEAN NOT NULL DEFAULT TRUE,
  two_factor_auth BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.merchant_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchant_notification_settings_staff_select ON public.merchant_notification_settings
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

-- 2. Merchant reconciliation runs — real internal-ledger-vs-itself matching
--    (same honest pattern as aggregator_reconciliations: no external bank
--    statement feed exists yet, so provider/bank totals equal the internal
--    ledger total by definition until a live feed is connected).
CREATE TABLE IF NOT EXISTS public.merchant_reconciliations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id            UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  reconciliation_date    DATE NOT NULL,
  channel_or_entity      VARCHAR(128) NOT NULL,
  provider_node          VARCHAR(128),
  internal_ledger_total  NUMERIC(24,2) NOT NULL DEFAULT 0,
  provider_gateway_total NUMERIC(24,2) NOT NULL DEFAULT 0,
  bank_settled_total     NUMERIC(24,2) NOT NULL DEFAULT 0,
  variance_amount        NUMERIC(24,2) NOT NULL DEFAULT 0,
  status                 VARCHAR(16) NOT NULL DEFAULT 'MATCHED' CHECK (status IN ('MATCHED', 'VARIANCE', 'INVESTIGATING')),
  discrepancy_count      INTEGER NOT NULL DEFAULT 0,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_merchant_reconciliations_merchant ON public.merchant_reconciliations(merchant_id, reconciliation_date DESC);

ALTER TABLE public.merchant_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchant_reconciliations_staff_select ON public.merchant_reconciliations
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

-- 3. Merchant support tickets now use the shared public.support_tickets
--    table (customer_type = 'MERCHANT'), identical to how the aggregator
--    portal reuses it — no separate table needed.

-- 4. Merchant webhook delivery log — real dispatch attempts against
--    merchant_webhook_endpoints (replaces the fake "Send Test Webhook").
CREATE TABLE IF NOT EXISTS public.merchant_webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id     UUID NOT NULL REFERENCES public.merchant_webhook_endpoints(id) ON DELETE CASCADE,
  merchant_id     UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  event_type      VARCHAR(64) NOT NULL,
  payload         JSONB NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DELIVERED', 'FAILED')),
  response_code   INTEGER,
  error_message   TEXT,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_webhook_deliveries_merchant ON public.merchant_webhook_deliveries(merchant_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_webhook_deliveries_endpoint ON public.merchant_webhook_deliveries(endpoint_id, attempted_at DESC);

ALTER TABLE public.merchant_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchant_webhook_deliveries_staff_select ON public.merchant_webhook_deliveries
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

-- 5. Merchant payout requests — real on-demand payout intent record backing
--    the wallet page's "On-Demand Instant Payout" (honest pending-provider
--    pattern: no live Providus payout rail exists yet, so this locks the
--    requested amount out of the available balance and records PENDING,
--    it never fabricates instant success).
CREATE TABLE IF NOT EXISTS public.merchant_payout_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id       UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  requested_by      UUID REFERENCES public.merchant_staff_users(id) ON DELETE SET NULL,
  amount            NUMERIC(24,2) NOT NULL CHECK (amount > 0),
  currency          VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
  destination_bank  VARCHAR(128),
  destination_account VARCHAR(32),
  status            VARCHAR(24) NOT NULL DEFAULT 'PENDING_PROVIDER_INTEGRATION' CHECK (status IN ('PENDING_PROVIDER_INTEGRATION', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  ledger_transaction_id UUID REFERENCES public.ledger_transactions(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_merchant_payout_requests_merchant ON public.merchant_payout_requests(merchant_id, created_at DESC);

ALTER TABLE public.merchant_payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchant_payout_requests_staff_select ON public.merchant_payout_requests
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

-- 6. Merchant auto-sweep configuration (was a fake local-state toggle).
CREATE TABLE IF NOT EXISTS public.merchant_sweep_settings (
  merchant_id     UUID PRIMARY KEY REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  auto_sweep_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sweep_frequency VARCHAR(24) NOT NULL DEFAULT 'DAILY_EOD' CHECK (sweep_frequency IN ('DAILY_EOD', 'INSTANT_PER_TX')),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.merchant_sweep_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchant_sweep_settings_staff_select ON public.merchant_sweep_settings
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

-- 7. Registered headquarters address on merchant_profiles (profile page
--    hardcoded "Plot 1044 Victoria Island" — now a real, editable column).
ALTER TABLE public.merchant_profiles
  ADD COLUMN IF NOT EXISTS registered_address TEXT,
  ADD COLUMN IF NOT EXISTS registered_city VARCHAR(128),
  ADD COLUMN IF NOT EXISTS registered_state VARCHAR(128);

-- 8. Pending in-store collections — replaces ReceivePaymentModal's fake
--    setTimeout simulation. POST /collections inserts a real
--    merchant_payment_transactions row with status
--    PENDING_PROVIDER_INTEGRATION against the branch's virtual NUBAN (no
--    ledger movement yet — no money has actually been confirmed received).
--    A cashier/owner then manually confirms receipt via this RPC, which is
--    the only path that posts the real ledger credit to the merchant's
--    settlement account and flips the transaction to SUCCESSFUL — the same
--    "merchant-attested confirmation, not instant fake success" pattern as
--    invoice mark-paid.
CREATE OR REPLACE FUNCTION public.confirm_merchant_collection(
  p_transaction_id UUID,
  p_merchant_id UUID
) RETURNS public.merchant_payment_transactions
LANGUAGE plpgsql AS $$
DECLARE
  v_tx public.merchant_payment_transactions;
  v_org_id UUID;
  v_settlement_account_id UUID;
  v_ledger_tx_id UUID;
  v_net NUMERIC(24,2);
BEGIN
  SELECT * INTO v_tx FROM public.merchant_payment_transactions
  WHERE id = p_transaction_id AND merchant_id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COLLECTION_NOT_FOUND';
  END IF;

  IF v_tx.status = 'SUCCESSFUL' THEN
    RETURN v_tx; -- already confirmed, idempotent
  END IF;

  IF v_tx.status NOT IN ('PENDING_PROVIDER_INTEGRATION', 'PROCESSING') THEN
    RAISE EXCEPTION 'COLLECTION_NOT_CONFIRMABLE';
  END IF;

  SELECT org_id, settlement_ledger_account_id INTO v_org_id, v_settlement_account_id
  FROM public.merchant_profiles WHERE id = p_merchant_id;

  IF v_settlement_account_id IS NULL THEN
    RAISE EXCEPTION 'MERCHANT_SETTLEMENT_ACCOUNT_NOT_PROVISIONED';
  END IF;

  v_net := v_tx.net_amount;

  INSERT INTO public.ledger_transactions (org_id, transaction_reference, description, total_amount, currency, status)
  VALUES (v_org_id, v_tx.reference, 'Merchant in-store collection — cashier confirmed', v_net, v_tx.currency, 'COMMITTED')
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
  SELECT v_org_id, 'MERCHANT-COLLECTIONS-CLEARING-' || v_tx.currency, 'Merchant Collections Clearing — ' || v_tx.currency, 'ASSET', v_tx.currency,
         (SELECT country FROM public.organizations WHERE id = v_org_id), 0.00
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ledger_accounts WHERE org_id = v_org_id AND currency = v_tx.currency AND account_number = 'MERCHANT-COLLECTIONS-CLEARING-' || v_tx.currency
  );

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  SELECT v_ledger_tx_id, id, 'DEBIT', v_net, v_tx.currency, 'In-store collection clears to merchant settlement'
  FROM public.ledger_accounts WHERE org_id = v_org_id AND currency = v_tx.currency AND account_number = 'MERCHANT-COLLECTIONS-CLEARING-' || v_tx.currency;

  INSERT INTO public.ledger_entries (transaction_id, account_id, entry_type, amount, currency, narration)
  VALUES (v_ledger_tx_id, v_settlement_account_id, 'CREDIT', v_net, v_tx.currency, 'In-store collection credited to merchant settlement account');

  UPDATE public.ledger_accounts SET balance = balance + v_net, updated_at = NOW() WHERE id = v_settlement_account_id;
  UPDATE public.ledger_accounts SET balance = balance - v_net, updated_at = NOW()
    WHERE org_id = v_org_id AND currency = v_tx.currency AND account_number = 'MERCHANT-COLLECTIONS-CLEARING-' || v_tx.currency;

  UPDATE public.merchant_payment_transactions
  SET status = 'SUCCESSFUL', ledger_transaction_id = v_ledger_tx_id, settled_at = NOW()
  WHERE id = p_transaction_id
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$;

-- ============================================================================
-- Workflow automation: real DB-side triggers so merchant activity generates
-- notifications and CRM updates automatically instead of only on manual
-- button clicks — mirrors notify_agent_on_transaction() from the agency
-- migration.
-- ============================================================================

-- 9. Auto-notify the merchant whenever a payment transaction is created or
--    changes status (replaces having zero automated notification source).
CREATE OR REPLACE FUNCTION public.notify_merchant_on_transaction()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.merchant_notifications (merchant_id, title, body, category)
    VALUES (
      NEW.merchant_id,
      CASE
        WHEN NEW.status = 'SUCCESSFUL' THEN 'Payment received'
        WHEN NEW.status = 'FAILED' THEN 'Payment failed'
        WHEN NEW.status = 'REFUNDED' THEN 'Payment refunded'
        ELSE 'Payment ' || NEW.status
      END,
      format('%s %s (ref %s) is now %s.', NEW.currency, NEW.amount, NEW.reference, NEW.status),
      'TRANSACTION'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_merchant_on_transaction ON public.merchant_payment_transactions;
CREATE TRIGGER trg_notify_merchant_on_transaction
  AFTER INSERT OR UPDATE ON public.merchant_payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_merchant_on_transaction();

-- 10. Auto-notify on settlement batch status changes.
CREATE OR REPLACE FUNCTION public.notify_merchant_on_settlement()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.merchant_notifications (merchant_id, title, body, category)
    VALUES (
      NEW.merchant_id,
      'Settlement ' || NEW.status,
      format('Settlement batch %s of %s %s is now %s.', NEW.batch_reference, NEW.currency, NEW.net_amount, NEW.status),
      'SETTLEMENT'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_merchant_on_settlement ON public.merchant_settlement_batches;
CREATE TRIGGER trg_notify_merchant_on_settlement
  AFTER INSERT OR UPDATE ON public.merchant_settlement_batches
  FOR EACH ROW EXECUTE FUNCTION public.notify_merchant_on_settlement();

-- 11. Auto-update merchant_customers_crm aggregate stats whenever a
--     successful transaction is recorded (was previously only ever set at
--     manual seed time — this is a real automated workflow: CRM rollups
--     recompute themselves off ledger-truth transaction data).
CREATE OR REPLACE FUNCTION public.rollup_merchant_customer_stats()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'SUCCESSFUL' AND NEW.customer_phone IS NOT NULL THEN
    UPDATE public.merchant_customers_crm
    SET total_spent = total_spent + NEW.amount,
        total_transactions_count = total_transactions_count + 1,
        last_transaction_date = NOW()
    WHERE merchant_id = NEW.merchant_id AND phone = NEW.customer_phone;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rollup_merchant_customer_stats ON public.merchant_payment_transactions;
CREATE TRIGGER trg_rollup_merchant_customer_stats
  AFTER UPDATE ON public.merchant_payment_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'SUCCESSFUL' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.rollup_merchant_customer_stats();

