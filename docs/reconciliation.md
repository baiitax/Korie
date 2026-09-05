# KORIEPAY 4-WAY AUTOMATED FINANCIAL RECONCILIATION

## 1. 4-Way Reconciliation Matrix
Reconciliation runs continuously to balance four independent operational layers:

```
+-------------------------------------------------------------------------+
| Layer 1: Internal API Transactions (transactions table)                 |
+-------------------------------------------------------------------------+
                                    ▲
                                    │ (Continuous 1:1 Match)
                                    ▼
+-------------------------------------------------------------------------+
| Layer 2: Double-Entry General Ledger (ledger_entries table)             |
+-------------------------------------------------------------------------+
                                    ▲
                                    │ (Nightly Clearing Batch)
                                    ▼
+-------------------------------------------------------------------------+
| Layer 3: Provider Network Logs (Providus NIP / Coris RTGS)              |
+-------------------------------------------------------------------------+
                                    ▲
                                    │ (Daily Statement Match)
                                    ▼
+-------------------------------------------------------------------------+
| Layer 4: Commercial Bank Clearing Account Statement (NUBAN Statement)  |
+-------------------------------------------------------------------------+
```

---

## 2. Discrepancy Categorization
- `MISSING_IN_LEDGER`: Provider debited external account without corresponding local ledger entry.
- `AMOUNT_MISMATCH`: Partial fee discrepancy between switch and local calculation.
- `STATUS_DRIFT`: Transaction marked PENDING locally but confirmed SUCCESSFUL at banking node.
