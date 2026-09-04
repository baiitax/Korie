# KoriePay Reconciliation & Settlement Engine — Security & Segregation Map

## 1. Defense-in-Depth Architecture
- **Row Level Security (RLS)**: Enforces tenant isolation on all reconciliation and settlement tables.
- **Privileged Service Role**: Direct journal modifications are rejected; privileged operations pass through audited stored functions with strict `search_path`.
- **Secret Zero Leakage**: Provider API keys, HMAC webhook secrets, SFTP passwords, and bank credentials are never sent to client browsers.

## 2. Role-Based Access Control (RBAC) Matrix
| Role | Reconciliation Run | Exception Resolve | Settlement Create | Settlement Approve | Suspense Write-off | Audit Read |
|---|---|---|---|---|---|---|
| **SUPER_ADMIN** | View | View | View | Denied (Maker-Checker) | Denied (Maker-Checker) | Full |
| **FINANCE_DIRECTOR** | Execute | Approve (Checker) | Review | **Approve (Checker)** | **Approve (Checker)** | Full |
| **RECONCILIATION_OFFICER** | Execute | **Submit (Maker)** | View | Denied | Submit (Maker) | Full |
| **SETTLEMENT_OFFICER** | View | View | **Create (Maker)** | Denied | Denied | Full |
| **AUDITOR (READ-ONLY)** | View | View | View | Denied | Denied | Full |

## 3. Maker-Checker Segregation Rule
The database and API layer strictly assert:
$$\text{maker\_id} \ne \text{checker\_id}$$
Any attempt by a user to approve their own settlement batch or financial adjustment throws an uncatchable security exception (`SECURITY_VIOLATION_MAKER_IS_CHECKER`).
