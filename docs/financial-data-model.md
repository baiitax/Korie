# Financial Data Model & Schema Specification

## 1. Entity Relationship Overview
```
[ chart_of_accounts ] ◄──┐
                          │ (references account_code)
[ journal_entries ] ────► [ journal_lines ]
      │
      ├─► [ account_balances ] (derived projected cache)
      ├─► [ account_holds ] (pre-commit balance locks)
      ├─► [ settlement_batches ] ──► [ settlement_items ]
      ├─► [ reconciliation_sessions ] ──► [ reconciliation_exceptions ]
      └─► [ financial_adjustments ] (maker-checker review table)
```

## 2. Table Schemas
All tables are defined in PostgreSQL migration `20260903000008_core_financial_engine.sql`.
- `journal_entries`: Stores journal headers, transaction IDs, source references, total debit and credit amounts.
- `journal_lines`: Stores immutable individual debit and credit entries with accounting dimensions (country, currency, product, customerId, merchantId).
- `account_balances`: Stores derived projection totals (`posted_debit_total`, `posted_credit_total`, `calculated_balance`, `available_balance`).
- `account_holds`: Stores temporary holds with reason codes and expiration timestamps.
- `settlement_batches`: Stores merchant payout batches, fee calculations, and Providus NIP payout references.
