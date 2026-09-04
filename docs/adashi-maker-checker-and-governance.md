# Adashi Maker-Checker Dual Controls & Governance Architecture

## 1. Dual-Control Governance Matrix

| Action | Maker Persona | Checker Persona | Justification / Validation |
|---|---|---|---|
| **Product Template Creation / Deprecation** | Product Manager | Head of Product / Risk Lead | Verifies regulatory fee caps and minimum reserve coverage. |
| **High-Value Payout Approval ($\ge 500k$)** | Adashi Operations Agent | Super Admin / Compliance Lead | Prevents internal agent collusive disbursement. |
| **Manual Rotation Sequence Override** | Group Admin / Agent | Adashi Supervisor | Verifies formal written consent from all affected members. |
| **Default Write-off & Guarantee Execution** | Collections Officer | Chief Risk Officer (CRO) | Confirms all legal and recovery waterfall steps exhausted. |
| **Emergency Adashi Freeze** | Fraud Analyst | Head of Security / MLRO | Immediate freeze of escrow disbursement under active SAR. |

---

## 2. Maker-Checker Lifecycle State Flow

```
[INITIATED] ──▶ (Maker submits proposal with reason & digital payload)
     │
     ├─────────────┐
     ▼             ▼
[APPROVED]     [REJECTED]
     │             │
     ▼             ▼
[EXECUTED]     [CANCELLED]
```
- **Self-Approval Prevention**: The system strictly enforces `maker_id !== checker_id`.
- **Time-to-Live (TTL)**: Unapproved pending requests expire automatically after 72 hours.
