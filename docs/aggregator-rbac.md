# KORIEPAY AGGREGATOR ROLE-BASED ACCESS CONTROL (RBAC)
## Granular Staff Permissions, Territory Scopes & Security Clearances

---

## 1. Role Definitions

| Role | Operational Scope | Key Permissions |
|---|---|---|
| **`AGGREGATOR_OWNER`** | Unrestricted corporate network | All permissions, API secrets rotation, team management, bank payouts |
| **`FINANCE_MANAGER`** | Treasury & Settlements | Authorize float dispatch, trigger Providus payouts, reconciliation proofs |
| **`OPERATIONS_MANAGER`** | Agency & Merchant operations | Manage agents, onboard merchants, resolve operational exceptions |
| **`COMPLIANCE_OFFICER`** | KYC / KYB Verification | Verify NIN/BVN documents, review CAC certificates, manage compliance backlog |
| **`FIELD_OFFICER`** | Assigned Territory Node | Inspect agent counters, verify drawer cash positions, hardware support |
| **`AUDITOR`** | Read-only compliance | Read-only access to immutable audit ledgers, statements, and tax reports |

---

## 2. Organization & Territory Scoping

All queries and mutations enforce multi-tenant constraints:
```sql
SELECT * FROM agents 
WHERE aggregator_id = auth.current_aggregator_id() 
  AND territory_id = ANY(auth.current_user_territory_scopes());
```
This ensures strict data isolation between territory supervisors and corporate leads.
