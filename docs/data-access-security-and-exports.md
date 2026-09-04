# Data Access Security, PII Protection & Governed Exports

## 1. Role-Based & Attribute-Based Access Control (RBAC & ABAC)

The Data Platform enforces strict access policies based on the principle of least privilege:

| IAM Role | Warehouse Read | Mart Read | Regulatory Reports | Financial Reports | PII Access | Export Rights |
|---|---|---|---|---|---|---|
| `SUPER_ADMIN` | Full | Full | Full | Full | Masked (Dual Auth for Unmask) | Governed |
| `CFO` | Read | Read | Approve | Approve | Masked | Governed |
| `CRO` | Read | Read | Approve | View | Masked | Governed |
| `CCO / AML` | Read | AML Mart | Approve | View | Unmasked (Compliance Clearance) | Governed |
| `FINANCE_ANALYST` | Mart Only | Financial | Prepare | Prepare | Masked | Request Required |
| `BOARD_VIEWER` | None | None | View Board Pack | View Board Pack | Anonymized | PDF Only |
| `AUDITOR` | Read Replica | Read Replica | Read Snapshot | Read Snapshot | Masked | Governed |

---

## 2. Governed Data Export Pipeline

To prevent data exfiltration, regulatory penalties, and PII leakage, all data exports must proceed through a multi-stage approval pipeline:

```
[EXPORT_REQUESTED]
       │ (User specifies dataset, filters, reason & recipient)
       ▼
[RISK_CHECK]
       │ (Automated scanner checks for unmasked PII, volume > 10,000 rows)
       ▼
[APPROVAL_REQUIRED]
       │ (Dual-authorization by Data Protection Officer or Data Steward)
       ▼
[APPROVED]
       │ (Signed short-lived download token generated with 24h expiration)
       ▼
[GENERATED & DOWNLOADED]
       │ (Cryptographic watermark and user ID embedded in file)
       ▼
[AUDITED]
       │ (Permanent, append-only record written to `report_export_events`)
```
