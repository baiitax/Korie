# 5-Way Physical Cash Reconciliation & Variance Investigation

## 1. 5-Way Physical Cash Reconciliation Matrix
The Reconciliation Engine reconciles 5 distinct dimensions of operational cash:
1. **Physical Cash Count**: Actual banknotes tallied per denomination.
2. **Operational Expected Cash**: Expected cash computed by cash position engine.
3. **Cash Movement Records**: Vault, Till, and CIT movement transfer logs.
4. **General Ledger Cash Accounts**: Subledger asset balances (`1040`, `1050`, `1060`, `1070`, `1080`, `1090`).
5. **Bank & CIT Confirmations**: Counterparty deposit slips and armored courier manifests.

---

## 2. Cash Variance Severity & Compensating Entries
| Variance Amount | Severity | Escalation & SLA |
| :--- | :--- | :--- |
| $\le ₦1,000$ / $2,500\text{ XOF}$ | `LOW` | Teller Level Investigation (24h) |
| $₦1,001 - ₦50,000$ | `MEDIUM` | Branch Head Review (12h) |
| $₦50,001 - ₦500,000$ | `HIGH` | Internal Audit & Fraud Desk (4h) |
| $> ₦500,000$ / $1,000,000\text{ XOF}$ | `CRITICAL` | Executive Escalation, SOC & Freeze (Immediate) |

- **No Silent Write-Offs**: Variances cannot be zeroed out. Reconciling adjustments require dual-authorization journal entries posting to `7400 Physical Cash Variance Suspense`.
