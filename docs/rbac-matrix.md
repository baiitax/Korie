# KORIEPAY ROLE-BASED ACCESS CONTROL (RBAC) MATRIX

## 1. Role Definitions & Clearance Hierarchy

| Role | Domain Scope | Financial Mutation | Credential Issuance | Audit Visibility |
|---|---|:---:|:---:|:---:|
| **SUPER_ADMIN** | Global Platform | Dual-Control Only | ✓ | Global |
| **ORGANIZATION_OWNER** | Single Tenant | ✓ | ✓ | Tenant-Wide |
| **ORGANIZATION_ADMIN** | Single Tenant | ✓ | ✓ (Sandbox Only) | Tenant-Wide |
| **DEVELOPER** | Single Tenant | Sandbox Only | ✓ (Sandbox Only) | API Logs |
| **FINANCE_OFFICER** | Settlement & Ledger | Maker-Checker | — | Financial Only |
| **COMPLIANCE_OFFICER**| AML / Sanctions | Case Disposition | — | Audit & Cases |
| **SUPPORT_OFFICER** | Customer 360 | ✗ Strictly Read-Only | — | Masked User Data |

---

## 2. Granular Permission Scopes
- `transfers:write`: Initiate cross-border and NIP outward transfers.
- `payments:read`, `payments:write`: Manage payment requests and verification.
- `wallets:read`, `wallets:write`: Sub-ledger creation and balance inspection.
- `kyc:verify`: Identity verification lookups.
- `agency:write`: POS cash withdrawal and deposit authorizations.
