# KoriePay Reconciliation & Settlement Engine — Database Architecture Map

## 1. Schema Topology
All financial data resides in PostgreSQL with strict Row Level Security (RLS) and schema isolation:

```
public
 ├── chart_of_accounts
 ├── accounting_rules & accounting_rule_versions
 ├── journal_entries & journal_lines (IMMUTABLE)
 ├── account_balances (DERIVED READ CACHE)
 ├── account_holds (CONCURRENCY LOCKS)
 ├── settlement_batches & settlement_items & settlement_reserves
 ├── reconciliation_runs
 ├── reconciliation_sources
 ├── reconciliation_records (CANONICAL)
 ├── reconciliation_matches
 ├── reconciliation_exceptions
 ├── reconciliation_exception_evidence
 ├── bank_accounts & bank_statements & bank_statement_lines
 ├── suspense_accounts & suspense_aging_items
 └── financial_adjustments (MAKER-CHECKER)
```

## 2. Table Schemas & Constraints
- **Zero Floating Point**: All amounts are represented as integer minor units (`BIGINT`) or exact `NUMERIC(24, 4)`.
- **Database Triggers**:
  - `trg_protect_journal_entries`: Raises uncatchable exception on `UPDATE`/`DELETE`.
  - `trg_validate_journal_balanced`: Asserts $\sum \text{Debits} == \sum \text{Credits}$ before `POSTED` transition.
  - `trg_no_direct_balance_mutation`: Prohibits manual balance writes.
- **Idempotency & Unique Keys**:
  - `reconciliation_runs(run_reference)` UNIQUE
  - `reconciliation_records(run_id, source_record_reference)` UNIQUE
  - `settlement_batches(batch_reference)` UNIQUE
  - `bank_statements(statement_hash)` UNIQUE
