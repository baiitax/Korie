-- ==============================================================================
-- KORIEPAY TIER-1 FINANCIAL PLATFORM: ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 20260903000007_row_level_security.sql
-- ==============================================================================

-- 1. Enable RLS on All Financial and Sensitive Tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_verification_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- 2. Organizations Tenant Isolation Policy
CREATE POLICY org_tenant_isolation_select ON public.organizations
    FOR SELECT
    USING (
        id = (NULLIF(current_setting('app.current_org_id', true), ''))::uuid
        OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
    );

-- 3. Customers Multi-Tenant Isolation Policy
CREATE POLICY customers_tenant_isolation ON public.customers
    FOR ALL
    USING (
        org_id = (NULLIF(current_setting('app.current_org_id', true), ''))::uuid
        OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
    );

-- 4. Wallets & Ledger Accounts Multi-Tenant Isolation
CREATE POLICY wallets_tenant_isolation ON public.wallets
    FOR ALL
    USING (
        org_id = (NULLIF(current_setting('app.current_org_id', true), ''))::uuid
        OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
    );

CREATE POLICY ledger_accounts_tenant_isolation ON public.ledger_accounts
    FOR ALL
    USING (
        org_id = (NULLIF(current_setting('app.current_org_id', true), ''))::uuid
        OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
    );

CREATE POLICY transactions_tenant_isolation ON public.transactions
    FOR ALL
    USING (
        org_id = (NULLIF(current_setting('app.current_org_id', true), ''))::uuid
        OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
    );

-- 5. Webhooks & Logs Isolation
CREATE POLICY webhooks_tenant_isolation ON public.webhook_endpoints
    FOR ALL
    USING (
        org_id = (NULLIF(current_setting('app.current_org_id', true), ''))::uuid
        OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
    );

-- 6. Audit Events (Read Allowed for Org Admin, Insert for Service Layer, Update Forbidden)
CREATE POLICY audit_events_tenant_isolation ON public.audit_events
    FOR SELECT
    USING (
        org_id = (NULLIF(current_setting('app.current_org_id', true), ''))::uuid
        OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
    );
