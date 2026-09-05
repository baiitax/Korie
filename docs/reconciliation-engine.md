# 4-Way Automated Reconciliation Engine

## 1. 4-Way Matching Topology
The KoriePay reconciliation engine continuously matches four distinct authoritative data sets:

```
[ 1. Internal Transaction DB ]
             ▲
             │ (Matches 1:1)
             ▼
[ 2. Immutable General Ledger ]
             ▲
             │ (Matches 1:1)
             ▼
[ 3. Provider Settlement Reports ] (Flutterwave, Paystack, Providus NIP Switch)
             ▲
             │ (Matches 1:1)
             ▼
[ 4. Core Bank Account Statements ] (Providus Bank MT940 & Coris Bank Statement)
```

## 2. Discrepancy Classification Taxonomy
1. **MISSING_IN_LEDGER**: Funds arrived at the bank but were not posted to the internal ledger.
2. **MISSING_AT_PROVIDER**: Internal transaction is marked SUCCESS, but the provider statement contains no corresponding record.
3. **AMOUNT_MISMATCH**: Provider record amount differs from internal transaction due to rounding or unannounced fee deductions.
4. **STATUS_DRIFT**: Provider marked transaction FAILED after initial webhook indicated SUCCESS.
5. **CURRENCY_MISMATCH**: Inbound remittance settled in incorrect currency denomination.

## 3. Discrepancy Resolution Lifecycle
- Any un-matched record is automatically quarantined into **Suspense Accounts** (`7100`, `7200`, `7300`).
- Discrepancies generate tickets in the Super Admin Reconciliation Queue.
- Resolution requires **Maker-Checker approval** before any corrective journal is committed.
