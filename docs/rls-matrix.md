# KORIEPAY ROW LEVEL SECURITY (RLS) POLICIES & ENFORCEMENT

## 1. Multi-Tenant RLS Matrix

| PostgreSQL Table | Policy Name | Permitted Roles / Conditions | Access Type |
|---|---|---|:---:|
| `public.organizations` | `org_tenant_isolation_select` | `id = app.current_org_id` OR `role = SUPER_ADMIN` | SELECT |
| `public.customers` | `customers_tenant_isolation` | `org_id = app.current_org_id` OR `role = SUPER_ADMIN` | ALL |
| `public.wallets` | `wallets_tenant_isolation` | `org_id = app.current_org_id` OR `role = SUPER_ADMIN` | ALL |
| `public.ledger_accounts` | `ledger_accounts_tenant_isolation` | `org_id = app.current_org_id` OR `role = SUPER_ADMIN` | ALL |
| `public.transactions` | `transactions_tenant_isolation` | `org_id = app.current_org_id` OR `role = SUPER_ADMIN` | ALL |
| `public.webhook_endpoints`| `webhooks_tenant_isolation` | `org_id = app.current_org_id` OR `role = SUPER_ADMIN` | ALL |
| `public.audit_events` | `audit_events_tenant_isolation` | `org_id = app.current_org_id` (Read only, No Updates) | SELECT |

---

## 2. Service-Role Bypasses
Direct `service_role` bypass is restricted exclusively to trusted internal microservice backend workers (outbox processors and reconciliation engines).
