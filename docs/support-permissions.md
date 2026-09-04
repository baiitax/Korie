# Support Role Permissions & RBAC Matrix

## Role Hierarchy & Clearance Tiers
| Role | Clearance Level | Permitted Actions | Restricted Actions |
|---|---|---|---|
| **Tier 1 (Junior Officer)** | Basic Frontline | View masked Customer 360, reply with approved macros, execute step-by-step playbooks, initiate float sync | Cannot approve refunds, change ledger balances, bypass KYC, or override security flags |
| **Tier 2 (Senior Support)** | Advanced Operations | Investigate complex disputes, reassign queues, override standard macros, manage high-value merchant cases | Cannot alter accounting balances directly without Treasury maker-checker |
| **Tier 3 (Finance Ops)** | Financial Specialist | Verify ledger reconciliation, process verified refunds, release Treasury settlement batches | Governed by dual-authorization accounting protocols |
| **Tier 3 (Fraud & Risk)** | Risk Specialist | Initiate temporary emergency account freezes, inspect device fingerprint traces | Requires MLRO confirmation for permanent asset forfeitures |
| **Tier 3 (Compliance)** | Regulatory Specialist | Review KYC/KYB discrepancies, file suspicious activity escalations to NFIU/CENTIF | Restricted to compliance case domain |
| **Support Supervisor** | Quality & Queue Lead | Reallocate workload, evaluate QA scores, publish knowledge articles, declare Parent Incidents | Standard operational oversight |
| **Super Admin** | System Governance | Configure global SLA rules, manage automation triggers, review cryptographic audit logs | Subject to multi-factor authentication and tamper-evident audit logging |
