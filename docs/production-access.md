# KORIEPAY PRODUCTION ACCESS GATING & APPROVAL WORKFLOW

## 1. Multi-Stage Gating Workflow
Production access is never automatically issued merely upon passing sandbox requests.

```
+------------------------------------+
| 1. Automated Integration Checks    | -> 100% Score on 6-point checklist
+------------------------------------+
                 │
                 ▼
+------------------------------------+
| 2. KYB / Corporate Verification    | -> Valid CAC (Nigeria) or RCCM (Niger)
+------------------------------------+
                 │
                 ▼
+------------------------------------+
| 3. Settlement Bank Binding         | -> Providus NUBAN or Coris WAEMU IBAN
+------------------------------------+
                 │
                 ▼
+------------------------------------+
| 4. Maker-Checker MLRO Sign-Off     | -> Internal Compliance Desk Review
+------------------------------------+
                 │
                 ▼
+------------------------------------+
| 5. Production Key Generation       | -> Issued in Key Vault with IP filter
+------------------------------------+
```
