# KORIEPAY DATABASE SCHEMAS & ENTITY RELATIONSHIPS

## 1. Domain Schemas Overview
The database is partitioned into strict logical domains within PostgreSQL:

```
public
├── identity          (organizations, organization_members, roles, permissions, user_profiles)
├── customers         (customers, customer_verification_status, customer_accounts)
├── wallets           (wallets, wallet_accounts, wallet_holds, wallet_limits)
├── ledger            (ledger_accounts, ledger_transactions, ledger_entries, ledger_balances)
├── transactions      (transactions, transaction_status_history, idempotency_keys, transaction_reversals)
├── integrations      (provider_nodes, provider_health_telemetry)
├── webhooks          (webhook_endpoints, webhook_delivery_logs)
├── outbox            (outbox_events, outbox_jobs)
├── reconciliation    (settlement_batches, reconciliation_runs, reconciliation_discrepancies)
└── audit             (audit_events)
```

---

## 2. Relational Entity Schema Definitions

### 2.1 Double-Entry Ledger Schema
```sql
CREATE TABLE public.ledger_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    account_number VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    balance BIGINT NOT NULL DEFAULT 0,
    locked_balance BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE public.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    transaction_reference VARCHAR(128) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    total_amount BIGINT NOT NULL CHECK (total_amount > 0),
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'COMMITTED'
);

CREATE TABLE public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
    entry_type VARCHAR(16) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount BIGINT NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    narration VARCHAR(255) NOT NULL
);
```
