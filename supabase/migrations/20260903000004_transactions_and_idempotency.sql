-- ==============================================================================
-- KORIEPAY TIER-1 FINANCIAL PLATFORM: TRANSACTIONS & IDEMPOTENCY
-- Migration: 20260903000004_transactions_and_idempotency.sql
-- ==============================================================================

-- 1. Canonical Financial Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    ledger_transaction_id UUID REFERENCES public.ledger_transactions(id) ON DELETE SET NULL,
    reference VARCHAR(128) NOT NULL UNIQUE,
    external_reference VARCHAR(128),
    idempotency_key VARCHAR(128) NOT NULL,
    request_id VARCHAR(128) NOT NULL,
    correlation_id VARCHAR(128) NOT NULL,
    type VARCHAR(64) NOT NULL CHECK (type IN (
        'CROSS_BORDER_TRANSFER', 'NIP_OUTWARD_TRANSFER', 'NIP_INWARD_SETTLEMENT',
        'MERCHANT_CHECKOUT', 'VIRTUAL_ACCOUNT_CREDIT', 'AGENCY_CASH_IN',
        'AGENCY_CASH_OUT', 'BILL_VEND', 'FX_CONVERSION', 'WALLET_FUNDING',
        'WALLET_TRANSFER', 'FEE_CHARGE', 'COMMISSION_PAYOUT'
    )),
    status VARCHAR(32) NOT NULL DEFAULT 'INITIATED' CHECK (status IN (
        'INITIATED', 'PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'REVERSED', 'CANCELLED', 'DISPUTED'
    )),
    amount BIGINT NOT NULL CHECK (amount > 0), -- Minor units
    fee BIGINT NOT NULL DEFAULT 0 CHECK (fee >= 0),
    net_amount BIGINT NOT NULL CHECK (net_amount >= 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    source_currency VARCHAR(3),
    destination_currency VARCHAR(3),
    exchange_rate NUMERIC(18, 6),
    recipient_name VARCHAR(255),
    recipient_bank VARCHAR(128),
    recipient_account VARCHAR(64),
    provider_code VARCHAR(64), -- e.g. PROVIDUS_NG, KORIS_NE, NIBSS
    provider_reference VARCHAR(128),
    provider_response_code VARCHAR(32),
    narration TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON public.transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON public.transactions(org_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_transactions_request_id ON public.transactions(request_id);
CREATE INDEX IF NOT EXISTS idx_transactions_correlation_id ON public.transactions(correlation_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_ref ON public.transactions(provider_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- 2. Transaction Status History (Audit State Transitions)
CREATE TABLE IF NOT EXISTS public.transaction_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    from_status VARCHAR(32) NOT NULL,
    to_status VARCHAR(32) NOT NULL,
    reason TEXT,
    actor_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_status_history_tx ON public.transaction_status_history(transaction_id);

-- 3. Distributed Idempotency Locks & Payload Vault
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(128) NOT NULL,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID,
    endpoint VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL, -- SHA-256 of canonical request payload
    response_status INT,
    response_body JSONB,
    status VARCHAR(32) NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING', 'COMMITTED', 'FAILED')),
    locked_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE (org_id, key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_key_lookup ON public.idempotency_keys(org_id, key);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at ON public.idempotency_keys(expires_at);

-- 4. Transaction Reversal Authorizations (Maker-Checker Enforced)
CREATE TABLE IF NOT EXISTS public.transaction_reversals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
    reversal_transaction_id UUID REFERENCES public.transactions(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    maker_id VARCHAR(128) NOT NULL,
    checker_id VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMPTZ
);
