# Settlement Accounting & Merchant Payables Engine

## 1. Settlement Lifecycle
1. **Gross Collections**: Inward payments credit `Merchant Undisbursed Payables (2100)` and debit `Bank Clearing (1100)`.
2. **Holdbacks & Rolling Reserves**: For risk mitigation, configurable reserve fractions (e.g. 5% for 30 days) are isolated in sub-accounts.
3. **MDR Deduction**: Processing fees are recognized immediately upon collection.
4. **Batch Disbursement (T+1 / Real-Time)**:
   - Debit: `Merchant Undisbursed Payables (2100)`
   - Credit: `Bank Settlement Account (1010)`
   - Status updated to `SETTLED`.
