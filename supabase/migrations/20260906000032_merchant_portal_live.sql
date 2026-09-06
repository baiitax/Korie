-- ==============================================================================
-- KORIEPAY MERCHANT / BUSINESS PORTAL — LIVE PRODUCTION SCHEMA
-- Migration: 20260906000032_merchant_portal_live.sql
--
-- CONTEXT: the Merchant Portal (/merchant/*, /api/v1/merchant/*) previously
-- ran entirely on client-side fixtures (src/services/merchantDataService.ts)
-- with zero backing tables. This migration is the ground-up real backend,
-- following the exact same design principles already proven for Agency
-- Banking (20260906000028/29) and the Customer Portal (20260906000030):
--
--   - A merchant business IS a `public.organizations` row
--     (business_type = 'MERCHANT'). Its staff users are real Supabase Auth
--     identities linked via `public.merchant_staff_users.auth_user_id`,
--     mirroring the `customers`/`agents` auth-linkage pattern exactly.
--   - No parallel ledger: a merchant's settlement balance lives in
--     `public.ledger_accounts` (one LIABILITY account per merchant org per
--     currency, exactly like a customer wallet's ledger_account_id). Every
--     payment that settles to the merchant posts a real double-entry row
--     into the existing ledger_transactions/ledger_entries tables.
--   - Honest status, no fabricated success: a self-serve-registered
--     merchant starts at kyb_status = 'PENDING' / status = 'PENDING' and
--     cannot receive real settlement funds until an ops reviewer verifies
--     KYB, exactly mirroring the agent PENDING-hold pattern. Checkout
--     transactions created against a real provider path stay in
--     'PENDING_PROVIDER_INTEGRATION' until a real acquiring/PSP
--     integration exists — nothing here invents a SUCCESSFUL card charge.
--   - RLS scopes every merchant-owned table to the caller's own
--     merchant_staff_users row (auth_user_id = auth.uid()), joined through
--     merchant org membership — never a client-supplied merchant id.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. MERCHANT ORGANIZATION PROFILE — one row per business, 1:1 extension of
--    public.organizations (business_type = 'MERCHANT'). Holds the
--    merchant-specific KYB/commercial fields that don't belong on the
--    generic organizations table.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  merchant_code VARCHAR(32) NOT NULL UNIQUE,
  business_name VARCHAR(255) NOT NULL,
  trading_name VARCHAR(255) NOT NULL,
  cac_number VARCHAR(64),
  tin_number VARCHAR(64),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  country VARCHAR(16) NOT NULL CHECK (country IN ('NG', 'NE')),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
  category VARCHAR(64) NOT NULL DEFAULT 'GENERAL_RETAIL',
  tier VARCHAR(16) NOT NULL DEFAULT 'TIER_1' CHECK (tier IN ('TIER_1', 'TIER_2', 'ENTERPRISE')),
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'RESTRICTED', 'DEACTIVATED')),
  kyb_status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (kyb_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  settlement_bank VARCHAR(128),
  settlement_account_number VARCHAR(32),
  settlement_ledger_account_id UUID REFERENCES public.ledger_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_profiles_org ON public.merchant_profiles(org_id);

ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. MERCHANT STAFF USERS — real Supabase Auth linkage, one row per human
--    who can sign in to the merchant portal. The MERCHANT_OWNER row is
--    created at self-serve registration time; ADMIN/FINANCE_MANAGER/
--    BRANCH_MANAGER/CASHIER/DEVELOPER/AUDITOR rows are invited later by an
--    owner/admin (invite flow can be added on top of this table later —
--    out of scope for this migration, but the `status='INVITED'` value is
--    already modeled).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(32),
  role VARCHAR(24) NOT NULL DEFAULT 'MERCHANT_OWNER' CHECK (role IN (
    'MERCHANT_OWNER', 'ADMIN', 'FINANCE_MANAGER', 'BRANCH_MANAGER', 'CASHIER', 'DEVELOPER', 'AUDITOR'
  )),
  branch_id UUID,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (merchant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_merchant_staff_merchant ON public.merchant_staff_users(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_staff_auth ON public.merchant_staff_users(auth_user_id);

ALTER TABLE public.merchant_staff_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_staff_self_select ON public.merchant_staff_users;
CREATE POLICY merchant_staff_self_select ON public.merchant_staff_users
  FOR SELECT USING (
    merchant_id IN (
      SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS merchant_profiles_staff_select ON public.merchant_profiles;
CREATE POLICY merchant_profiles_staff_select ON public.merchant_profiles
  FOR SELECT USING (
    id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 3. BRANCHES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  branch_name VARCHAR(255) NOT NULL,
  branch_code VARCHAR(32),
  address TEXT,
  city VARCHAR(128),
  state_or_region VARCHAR(128),
  country VARCHAR(16) NOT NULL DEFAULT 'NG' CHECK (country IN ('NG', 'NE')),
  manager_name VARCHAR(255),
  virtual_nuban VARCHAR(32),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_branches_merchant ON public.merchant_branches(merchant_id);

ALTER TABLE public.merchant_branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_branches_staff_select ON public.merchant_branches;
CREATE POLICY merchant_branches_staff_select ON public.merchant_branches
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'merchant_staff_branch_fkey') THEN
    ALTER TABLE public.merchant_staff_users
      ADD CONSTRAINT merchant_staff_branch_fkey FOREIGN KEY (branch_id) REFERENCES public.merchant_branches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. PAYMENT TRANSACTIONS — real checkout/collection records. Every row is
--    1:1 with a ledger_transactions posting once/if it settles; a
--    self-serve merchant sees these land in PENDING_PROVIDER_INTEGRATION
--    until a real acquiring integration exists (see note at top of file).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.merchant_branches(id) ON DELETE SET NULL,
  ledger_transaction_id UUID REFERENCES public.ledger_transactions(id) ON DELETE SET NULL,
  reference VARCHAR(64) NOT NULL UNIQUE,
  provider_reference VARCHAR(128),
  order_id VARCHAR(128),
  invoice_id UUID,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(32),
  amount NUMERIC(24,2) NOT NULL CHECK (amount > 0),
  fee NUMERIC(24,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(24,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
  payment_method VARCHAR(32) NOT NULL DEFAULT 'BANK_TRANSFER',
  channel VARCHAR(24),
  narration TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING_PROVIDER_INTEGRATION' CHECK (status IN (
    'PENDING_PROVIDER_INTEGRATION', 'PROCESSING', 'SUCCESSFUL', 'FAILED',
    'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED', 'CANCELLED'
  )),
  cashier_staff_id UUID REFERENCES public.merchant_staff_users(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ,
  UNIQUE (merchant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_merchant_txns_merchant ON public.merchant_payment_transactions(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_txns_status ON public.merchant_payment_transactions(status);

ALTER TABLE public.merchant_payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_txns_staff_select ON public.merchant_payment_transactions;
CREATE POLICY merchant_txns_staff_select ON public.merchant_payment_transactions
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 5. PAYMENT LINKS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(128) NOT NULL,
  link_type VARCHAR(16) NOT NULL DEFAULT 'SINGLE' CHECK (link_type IN ('SINGLE', 'REUSABLE', 'SUBSCRIPTION')),
  amount NUMERIC(24,2),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'PAUSED')),
  redirect_url TEXT,
  total_payments_count INT NOT NULL DEFAULT 0,
  total_collected NUMERIC(24,2) NOT NULL DEFAULT 0,
  successful_payments_count INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.merchant_staff_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (merchant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_merchant_links_merchant ON public.merchant_payment_links(merchant_id);

ALTER TABLE public.merchant_payment_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_links_staff_select ON public.merchant_payment_links;
CREATE POLICY merchant_links_staff_select ON public.merchant_payment_links
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 6. INVOICES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  invoice_number VARCHAR(64) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(32),
  customer_address TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(24,2) NOT NULL DEFAULT 0,
  tax NUMERIC(24,2) NOT NULL DEFAULT 0,
  discount NUMERIC(24,2) NOT NULL DEFAULT 0,
  total NUMERIC(24,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'ISSUED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'
  )),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  virtual_account_nuban VARCHAR(32),
  virtual_account_bank VARCHAR(128),
  notes TEXT,
  paid_amount NUMERIC(24,2) NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.merchant_staff_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (merchant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_merchant_invoices_merchant ON public.merchant_invoices(merchant_id, created_at DESC);

ALTER TABLE public.merchant_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_invoices_staff_select ON public.merchant_invoices;
CREATE POLICY merchant_invoices_staff_select ON public.merchant_invoices
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'merchant_txns_invoice_fkey') THEN
    ALTER TABLE public.merchant_payment_transactions
      ADD CONSTRAINT merchant_txns_invoice_fkey FOREIGN KEY (invoice_id) REFERENCES public.merchant_invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 7. CUSTOMER CRM — merchant's own record of who has paid them (distinct
--    from public.customers, which is KoriePay's own wallet customers).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_customers_crm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(32) NOT NULL,
  total_spent NUMERIC(24,2) NOT NULL DEFAULT 0,
  total_transactions_count INT NOT NULL DEFAULT 0,
  last_transaction_date TIMESTAMPTZ,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (merchant_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_merchant_crm_merchant ON public.merchant_customers_crm(merchant_id);

ALTER TABLE public.merchant_customers_crm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_crm_staff_select ON public.merchant_customers_crm;
CREATE POLICY merchant_crm_staff_select ON public.merchant_customers_crm
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 8. SETTLEMENT BATCHES — internal-ledger-only settlement record, same
--    honest pattern as the agency banking settlement_batches: this is
--    KoriePay's authoritative internal record of what is owed to the
--    merchant, not a live bank-payout confirmation.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  batch_reference VARCHAR(64) NOT NULL UNIQUE,
  gross_amount NUMERIC(24,2) NOT NULL DEFAULT 0,
  total_fees NUMERIC(24,2) NOT NULL DEFAULT 0,
  refunds_deducted NUMERIC(24,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(24,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
  bank_name VARCHAR(128),
  account_number VARCHAR(32),
  status VARCHAR(16) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'PROCESSING', 'SETTLED', 'FAILED', 'ON_HOLD')),
  transaction_count INT NOT NULL DEFAULT 0,
  ledger_transaction_id UUID REFERENCES public.ledger_transactions(id) ON DELETE SET NULL,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_settlements_merchant ON public.merchant_settlement_batches(merchant_id, created_at DESC);

ALTER TABLE public.merchant_settlement_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_settlements_staff_select ON public.merchant_settlement_batches;
CREATE POLICY merchant_settlements_staff_select ON public.merchant_settlement_batches
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 9. DISPUTES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  dispute_reference VARCHAR(64) NOT NULL UNIQUE,
  transaction_id UUID REFERENCES public.merchant_payment_transactions(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  amount NUMERIC(24,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
  reason TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'WON', 'LOST', 'RESOLVED')),
  evidence_deadline TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_disputes_merchant ON public.merchant_disputes(merchant_id, created_at DESC);

ALTER TABLE public.merchant_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_disputes_staff_select ON public.merchant_disputes;
CREATE POLICY merchant_disputes_staff_select ON public.merchant_disputes
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 10. API KEYS + WEBHOOKS — developer tooling for the merchant's own
--     integration (distinct from KoriePay's internal API gateway key vault).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  key_name VARCHAR(128) NOT NULL,
  public_key VARCHAR(128) NOT NULL UNIQUE,
  secret_key_hash TEXT NOT NULL,
  secret_key_last4 VARCHAR(8) NOT NULL,
  environment VARCHAR(16) NOT NULL DEFAULT 'SANDBOX' CHECK (environment IN ('PRODUCTION', 'SANDBOX')),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.merchant_staff_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_api_keys_merchant ON public.merchant_api_keys(merchant_id);

ALTER TABLE public.merchant_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_api_keys_staff_select ON public.merchant_api_keys;
CREATE POLICY merchant_api_keys_staff_select ON public.merchant_api_keys
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.merchant_webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret_hash TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FAILING', 'DISABLED')),
  success_rate NUMERIC(5,2),
  last_delivery_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_webhooks_merchant ON public.merchant_webhook_endpoints(merchant_id);

ALTER TABLE public.merchant_webhook_endpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_webhooks_staff_select ON public.merchant_webhook_endpoints;
CREATE POLICY merchant_webhooks_staff_select ON public.merchant_webhook_endpoints
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 11. AUDIT LOG — same pattern as agent_audit_logs.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.merchant_profiles(id) ON DELETE SET NULL,
  actor_staff_id UUID REFERENCES public.merchant_staff_users(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(64),
  target_id VARCHAR(128),
  result VARCHAR(16) NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_audit_merchant ON public.merchant_audit_logs(merchant_id);

ALTER TABLE public.merchant_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_audit_staff_select ON public.merchant_audit_logs;
CREATE POLICY merchant_audit_staff_select ON public.merchant_audit_logs
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 12. NOTIFICATIONS — real feed table, same pattern as agent_notifications,
--     for the on-hold banner / activity feed on the merchant dashboard.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  category VARCHAR(32) NOT NULL DEFAULT 'GENERAL',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_notifications_merchant ON public.merchant_notifications(merchant_id, created_at DESC);

ALTER TABLE public.merchant_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_notifications_staff_select ON public.merchant_notifications;
CREATE POLICY merchant_notifications_staff_select ON public.merchant_notifications
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 13. KYB DOCUMENTS — manual-review pattern, reusing the exact shape of
--     agent_kyc_documents, with its own private storage bucket.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_kyb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  document_type VARCHAR(32) NOT NULL CHECK (document_type IN (
    'CAC_CERTIFICATE', 'TIN_CERTIFICATE', 'MEMART', 'PROOF_OF_ADDRESS',
    'DIRECTOR_ID', 'BANK_STATEMENT', 'UTILITY_BILL', 'OTHER'
  )),
  storage_path TEXT NOT NULL,
  original_filename VARCHAR(255),
  mime_type VARCHAR(128),
  file_size_bytes BIGINT,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_kyb_docs_merchant ON public.merchant_kyb_documents(merchant_id);

ALTER TABLE public.merchant_kyb_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_kyb_docs_staff_select ON public.merchant_kyb_documents;
CREATE POLICY merchant_kyb_docs_staff_select ON public.merchant_kyb_documents
  FOR SELECT USING (
    merchant_id IN (SELECT merchant_id FROM public.merchant_staff_users WHERE auth_user_id = auth.uid())
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('merchant-kyb-documents', 'merchant-kyb-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 14. FUNCTION — provisions the merchant's zero-balance settlement ledger
--     account. Called once at self-serve registration time, mirroring
--     provision_customer_wallet(). No starting balance is ever fabricated.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_merchant_settlement_account(
  p_merchant_id UUID,
  p_org_id UUID,
  p_currency VARCHAR,
  p_country VARCHAR
) RETURNS public.ledger_accounts
LANGUAGE plpgsql
AS $$
DECLARE
  v_account public.ledger_accounts;
  v_account_number VARCHAR(64);
BEGIN
  SELECT la.* INTO v_account
  FROM public.merchant_profiles mp
  JOIN public.ledger_accounts la ON la.id = mp.settlement_ledger_account_id
  WHERE mp.id = p_merchant_id;

  IF FOUND THEN
    RETURN v_account;
  END IF;

  v_account_number := 'MER-SETL-' || p_currency || '-' || substr(replace(p_merchant_id::text, '-', ''), 1, 10);

  INSERT INTO public.ledger_accounts (org_id, account_number, name, type, currency, country, balance)
  VALUES (p_org_id, v_account_number, 'Merchant Settlement Account', 'LIABILITY', p_currency, p_country, 0.00)
  RETURNING * INTO v_account;

  UPDATE public.merchant_profiles SET settlement_ledger_account_id = v_account.id, updated_at = NOW() WHERE id = p_merchant_id;

  RETURN v_account;
END;
$$;
