# Enterprise Regulatory Reporting & Data Platform Architecture

## 1. Executive Summary & Architectural Overview

The **KoriePay Regulatory Reporting & Enterprise Data Platform** is a Tier-1 financial data governance, warehouse, and management information control plane serving Nigeria (CBN, NFIU, NDIC) and Niger Republic (BCEAO, CENTIF).

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   AUTHORITATIVE OPERATIONAL SYSTEMS OF RECORD                    │
│  Customers • Accounts • Payment Switch • Double-Entry Ledger • GL • Settlement   │
│  Reconciliation • Cash Vaults • Treasury • AML • Fraud • IAM/SOC • ERM • Capital │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Event Streams / CDC / API Feeds / Outbox
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               RAW / LANDING ZONE                                 │
│  Immutable Ingestion • Checksum Hashes • Source Timestamps • Schema Versioning   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Normalization & Standardization
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         CANONICAL ENTERPRISE DATA MODEL                          │
│  Standardized Timestamps, Currencies (NGN, XOF), Entity & Account References     │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Star & Snowflake Fact/Dimension Loading
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             ENTERPRISE DATA WAREHOUSE                            │
│  Dimension Models (SCD Type 2) • Fact Tables • Controlled Snapshots              │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Domain Projections & Data Quality Gates
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               DOMAIN DATA MARTS                                  │
│  Financial Mart • Payments Mart • Treasury Mart • Risk Mart • AML Mart • etc.    │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Governed Metric Calculation & Lineage
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       REGULATORY & MANAGEMENT CONTROL PLANE                      │
│  Regulatory Reports • Management Information • Executive Cockpits • Board Pack   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Non-Negotiable Principles

1. **Authoritative Operational Truth**: The data warehouse and reporting layer never invent, alter, or become the authoritative system of record for customer balances, account postings, payment execution states, settlement clearing, or AML investigation decisions.
2. **End-to-End Lineage & Reproducibility**: Every number on an official regulatory submission or executive board report must be deterministically traceable back through report versions, metrics, datasets, facts, source records, and underlying immutable double-entry ledger journals.
3. **Multi-Jurisdictional Isolation & Currency Governance**: Separate entity and regulatory frameworks for Nigeria (NGN, Central Bank of Nigeria) and Niger Republic (XOF, Banque Centrale des États de l'Afrique de l'Ouest). No cross-currency aggregation occurs without explicit, versioned FX conversion rates.
4. **Immutable Report Snapshots**: Once an official regulatory report is approved through dual-authorization (maker-checker), an immutable cryptographic snapshot is created. Historical reports are never modified in place; corrections require non-destructive, auditable restatements.
5. **Data Quality Gates**: Automated data quality validations across 8 dimensions (Completeness, Accuracy, Timeliness, Consistency, Uniqueness, Validity, Referential Integrity, Reconciliation) govern dataset readiness before regulatory filing.

---

## 3. Data Processing Zones

### A. Raw / Landing Zone
- Stores raw incoming event payloads, CDC records, and batch extracts in their native schema.
- **Attributes**: `source_system`, `ingestion_timestamp`, `batch_id`, `payload_checksum_sha256`, `schema_version`, `jurisdiction`, `entity_id`, `currency`, `status`.
- **Immutability Guarantee**: Write-once, append-only; updates are strictly prohibited.

### B. Standardized Data Layer
- Cleanses and transforms raw inputs into uniform technical representations.
- Standardizes UTC ISO 8601 timestamps, ISO 4217 currency codes, canonical status enumerations, and standardized phone/tax identifiers.

### C. Canonical Enterprise Data Model
- Implements shared enterprise entities: `customer_id`, `account_id`, `transaction_id`, `journal_id`, `journal_line_id`, `settlement_id`, `provider_id`, `agent_id`, `merchant_id`, `entity_id`, `country_id`, `currency_code`, `product_id`, `channel_id`.
- Prevents disparate departments from inventing divergent definitions for identical business entities.

### D. Enterprise Data Warehouse & Domain Data Marts
- Fact and slowly-changing dimension tables optimized for analytical projection and multi-period aggregation.
- Domain marts isolate specialized query patterns: `financial_mart`, `payments_mart`, `treasury_mart`, `risk_mart`, `aml_mart`, `fraud_mart`, `security_mart`, `regulatory_mart`, `operations_mart`, `consumer_mart`, `provider_mart`, `capital_mart`.

---

## 4. Regulatory Reporting Lifecycle

```
[DRAFT]
   │
   ▼
[DATA_COLLECTION] ──▶ (Automated Ingestion from Domain Marts)
   │
   ▼
[DATA_READY] ───────▶ (Data Quality Checks & Reconciliation Passed)
   │
   ▼
[VALIDATION] ───────▶ (Regulatory Rule Evaluation & Debit/Credit Balancing)
   │
   ▼
[PREPARED] ─────────▶ (Report Pre-rendering & Evidence Pack Generation)
   │
   ▼
[REVIEW] ───────────▶ (Finance / Compliance Officer Review)
   │
   ▼
[APPROVAL_PENDING] ─▶ (Maker-Checker Dual Authorization)
   │
   ▼
[APPROVED] ─────────▶ (Cryptographic Immutable Snapshot Generated)
   │
   ▼
[SUBMITTED] ────────▶ (Idempotent Dispatch via API/SFTP/Portal)
   │
   ▼
[ACKNOWLEDGED] ─────▶ (Regulator Acknowledgment Token & Timestamp Logged)
   │
   ▼
[RECONCILED] ───────▶ (Post-Submission Verification Completed)
   │
   ▼
[CLOSED] ───────────▶ (Archived into Regulatory Audit Vault)
```

---

## 5. Security, RBAC & Auditability
- **Granular Roles**: `SUPER_ADMIN`, `DATA_ADMIN`, `DATA_STEWARD`, `REPORT_ANALYST`, `REGULATORY_MANAGER`, `FINANCE_MANAGER`, `CFO`, `CRO`, `COO`, `CEO`, `BOARD_VIEWER`, `AUDITOR`.
- **PII Protection**: Automatic tokenization and masking of sensitive identity numbers (BVN, NIN, National ID, full account numbers).
- **Append-Only Audit Trails**: All report generation, metric modification, maker-checker approval, data export, and submission events are captured in tamper-evident audit logs.
