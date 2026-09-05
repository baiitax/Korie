# Financial Reconciliation & Multi-Currency Reporting Governance

## 1. Automated 7-Point Financial Reconciliation

Before any financial or regulatory report is approved for filing, the automated **7-Point Reconciliation Engine** validates end-to-end mathematical consistency:

```
[1. Operational Transactions] ──▶ Reconciled to ──▶ [2. Double-Entry Ledger]
                                                          │
                                                          ▼
[3. General Ledger (GL)]       ◀── Reconciled to ── [2. Double-Entry Ledger]
         │
         ▼
[4. Settlement Clearing]      ──▶ Reconciled to ──▶ [5. Bank Nostro Positions]
         │
         ▼
[6. Warehouse Financial Mart] ──▶ Reconciled to ──▶ [7. Regulatory Output Cells]
```

### Critical Financial Invariants Tested:
1. **Double-Entry Balance Equation**: $\sum \text{Debits} \equiv \sum \text{Credits}$ across all journal postings.
2. **Trial Balance Equation**: $\text{Assets} \equiv \text{Liabilities} + \text{Equity} + (\text{Revenue} - \text{Expenses})$.
3. **Customer Liability Reconciliation**: $\sum \text{Customer Wallets} \equiv \text{GL Account 2100 (Customer Deposits)}$.
4. **Nostro Reserve Safeguarding**: $\sum \text{Correspondent Bank Accounts (Providus + Coris)} \ge \sum \text{Customer Liabilities}$.
5. **Roll-Forward Integrity**: $\text{Closing Balance} \equiv \text{Opening Balance} + \sum \text{Inflows} - \sum \text{Outflows}$.

---

## 2. Multi-Currency Isolation & Conversion Protocol

KoriePay natively processes:
- **NGN**: Nigerian Naira (ISO 4217: `566`)
- **XOF**: West African CFA Franc (ISO 4217: `952`)

### Golden Rules:
1. **No Implicit Currency Addition**: NGN and XOF balances are never summed without explicit conversion.
2. **Point-in-Time FX Fixings**: When consolidated group reporting is generated, all non-base currencies use the authoritative, versioned central bank fixing rate for the exact reporting cut-off timestamp.
3. **FX Conversion Metadata**: Every consolidated figure carries: `source_currency`, `target_currency`, `fx_rate`, `rate_source` (e.g., `CBN_OFFICIAL_FIXING`), `rate_timestamp`.

---

## 3. Entity Consolidation & Intercompany Elimination

For multi-entity group reporting across Nigeria and Niger Republic:
- **Intercompany Accounts**: Receivables and payables between KoriePay Nigeria Ltd and KoriePay Niger SA are matched and eliminated at the consolidated layer.
- **Traceable Elimination Entries**: All elimination entries are logged in `reporting_adjustments` with complete audit trails.
