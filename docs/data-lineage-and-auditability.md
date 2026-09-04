# Data Lineage Engine & Cryptographic Auditability

## 1. Lineage Architecture

The KoriePay Data Lineage Engine provides bidirectional graph navigation answering the foundational question: **"Where did this specific number originate?"**

```
┌─────────────────────────────────────────────────────────────┐
│                   OFFICIAL REPORT CELL                      │
│   e.g. CBN Monthly Return - Line 4: Customer Liabilities    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      REPORTING DATASET                      │
│   e.g. `ds_cbn_monthly_liabilities_v2026_09`                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      DOMAIN DATA MART                       │
│   e.g. `financial_mart.fact_daily_balances`                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    TRANSFORMATION & ETL                     │
│   e.g. `sql_transform_aggregate_wallet_liabilities_v2`      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 CANONICAL DATA WAREHOUSE                    │
│   e.g. `dw.fact_ledger_postings` (Filtered: GL 2000-2999)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  AUTHORITATIVE CORE LEDGER                  │
│   e.g. Double-Entry Journal Lines (Debit / Credit Rows)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               ORIGINATING TRANSACTION EVENT                 │
│   e.g. `tx-890214-providus-nip-inward`                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Lineage Node & Edge Schema

- **Lineage Nodes**: Represent entities across all layers (`REPORT_CELL`, `METRIC`, `DATASET`, `MART_TABLE`, `TRANSFORMATION`, `WAREHOUSE_TABLE`, `SOURCE_TABLE`, `LEDGER_ACCOUNT`, `TRANSACTION`).
- **Lineage Edges**: Directed acyclic graph (DAG) edges detailing source node, target node, transformation logic hash, and dependency type (`DIRECT_DERIVATION`, `AGGREGATION`, `FILTER`, `JOIN`).

---

## 3. Cryptographic Verification & Auditability

1. **Dataset Hashing**: Every batch ingestion and data mart snapshot generates a SHA-256 payload hash.
2. **Deterministic Query Re-execution**: Historical queries executed against versioned snapshots produce bit-identical results.
3. **Immutable Audit Logs**: All lineage graph mutations and report snapshot access events are recorded in an append-only, tamper-evident PostgreSQL audit table with cryptographic chaining.
