# Enterprise Data Warehouse Schema, Fact Models & Domain Data Marts

## 1. Data Warehouse Dimensional Modeling Strategy

The KoriePay Enterprise Data Warehouse utilizes a hybrid Star/Snowflake schema optimized for multi-jurisdiction financial analysis, point-in-time regulatory reproducibility, and high-performance querying without touching transactional OLTP tables.

---

## 2. Shared Enterprise Dimension Tables

### `dim_date` & `dim_time`
- Granular date and time dimensions supporting Calendar Year, Fiscal Year, Quarter, Month, ISO Week, Day of Week, Holiday indicators for Nigeria and Niger Republic.

### `dim_customer` (Slowly Changing Dimension Type 2)
- `customer_key` (Surrogate Primary Key)
- `customer_id` (Business Key)
- `customer_segment` (RETAIL, AGENT, MERCHANT, CORPORATE)
- `kyc_tier` (TIER_1, TIER_2, TIER_3)
- `risk_class` (LOW, MEDIUM, HIGH, PEP)
- `country_code` (NG, NE)
- `is_active` (BOOLEAN)
- `effective_from` (TIMESTAMPTZ)
- `effective_to` (TIMESTAMPTZ)
- `is_current` (BOOLEAN)

### `dim_account` (SCD Type 2)
- `account_key`
- `account_id`
- `account_number_masked`
- `account_type` (CUSTOMER_WALLET, SETTLEMENT_CLEARING, NOSTRO, GL_INCOME, GL_EXPENSE)
- `currency` (NGN, XOF)
- `gl_code`
- `entity_id`
- `effective_from`, `effective_to`, `is_current`

### `dim_entity` & `dim_jurisdiction`
- `entity_key`
- `legal_entity_name` (KoriePay Nigeria Ltd, KoriePay Niger SA)
- `jurisdiction_code` (NG, NE)
- `primary_regulator` (CBN, BCEAO)
- `base_currency` (NGN, XOF)

---

## 3. Core Analytical Fact Tables

### `fact_transactions`
Analytical representation of payment events across rails:
- `transaction_key`
- `transaction_id` (Authoritative Reference)
- `date_key`, `time_key`
- `customer_key`, `account_key`, `provider_key`, `channel_key`
- `gross_amount` (in minor currency units / cents)
- `fee_amount`
- `interchange_cost`
- `net_amount`
- `currency`
- `transaction_type` (TRANSFER_P2P, BILL_PAY, CASH_IN, CASH_OUT, CARD_PURCHASE)
- `settlement_status` (SETTLED, PENDING, RECONCILED)

### `fact_ledger_postings`
Aggregated postings directly mirroring double-entry journal lines:
- `posting_key`
- `journal_id`, `journal_line_id`
- `account_key`
- `debit_amount`, `credit_amount`
- `balance_after`
- `value_date`, `accounting_date`
- `currency`

### `fact_daily_balances`
Point-in-time closing balance snapshots per account:
- `balance_key`
- `account_key`, `date_key`
- `opening_balance`
- `total_debits`, `total_credits`
- `closing_balance`
- `is_reconciled`

---

## 4. Domain Data Marts

### A. Financial Mart (`financial_mart`)
- P&L movements, balance sheet assets, liabilities, equity, net fee margins, and provider interchange expenses.
- Supports automated Trial Balance, Income Statement, and Balance Sheet generation.

### B. Payments & Switch Mart (`payments_mart`)
- Aggregates switch latency, transaction success/failure rates, routing breakdowns, and clearing batches.

### C. Treasury & Liquidity Mart (`treasury_mart`, `liquidity_mart`)
- Nostro bank balances (Providus Bank Nigeria, Koris Bank Niger Republic), vault balances, reserve requirements, and 30-day liquidity buffer coverage.

### D. Risk, AML & Fraud Mart (`risk_mart`, `aml_mart`, `fraud_mart`)
- Suspicious activity alerts, PEP/Sanctions screening matches, gross fraud attempts, recovered amounts, and net fraud loss basis points (bps).

### E. Regulatory Mart (`regulatory_mart`)
- Staged datasets specifically mapped to CBN, NFIU, NDIC, BCEAO, and CENTIF reporting schemas.
- Incorporates data quality validation flags and immutable snapshot pointers.
