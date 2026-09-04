# Governed Data Dictionary & Enterprise Metadata Catalog

## 1. Governance Principles

Every metric, dataset, and reporting asset within KoriePay must be registered in the **Governed Enterprise Data Dictionary**. Unregistered or local ad-hoc formulas are strictly prohibited in official financial, regulatory, and board reporting.

---

## 2. Metadata Catalog Attributes

For every governed metric, the catalog enforces:

1. **Metric Identification**: Unique alphanumeric code (e.g., `MTR-FIN-CUST-LIAB-01`).
2. **Business Definition**: Plain-language description approved by the business owner.
3. **Technical Definition**: Exact SQL/algebraic transformation specification.
4. **Authoritative Source System**: The authoritative domain producing the facts (e.g., `CORE_LEDGER`, `PAYMENT_SWITCH`).
5. **Source Entities & Fields**: Tables and columns consumed.
6. **Data Stewardship & Ownership**:
   - **Data Owner**: Executive responsible for data accuracy (e.g., CFO, CRO).
   - **Data Steward**: Operational custodian managing data quality rules.
   - **Technical Owner**: Engineering lead maintaining data pipelines.
7. **Confidentiality & Regulatory Classification**: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED_PII`.
8. **Version Control**: Semantic versioning (e.g., `v2.1.0`) with effective and expiry dates.

---

## 3. Core Governed Metrics Sample

| Metric Code | Metric Name | Domain | Business Definition | Formula / Transformation | Data Owner | Steward | Classification |
|---|---|---|---|---|---|---|---|
| `MTR-FIN-001` | Total Customer Liability Funds | Financial | Total customer wallet liabilities owed at reporting cut-off. | `SUM(customer_wallet_accounts.balance)` | CFO | Financial Controller | RESTRICTED |
| `MTR-TREAS-001`| Available Liquid Nostro Reserves | Treasury | Total cleared funds held in commercial correspondent banks. | `SUM(nostro_accounts.cleared_balance)` | Group Treasurer | Treasury Lead | CONFIDENTIAL |
| `MTR-PAY-001` | Switch Success Rate | Payments | Percentage of completed payment attempts. | `(Successful Txs / Total Txs) * 100` | VP Engineering | SRE Lead | INTERNAL |
| `MTR-FRD-001` | Net Fraud Loss Ratio (bps) | Fraud | Monthly unrecovered fraud losses expressed as bps of GTV. | `(Net Fraud Loss / GTV) * 10000` | CRO | Fraud Lead | CONFIDENTIAL |
| `MTR-AML-001` | High-Risk AML Alert SLA Compliance | AML | Percentage of High-Risk alerts investigated within 72 hours. | `(Alerts Closed <= 72h / Total Alerts) * 100`| CCO | AML Lead | RESTRICTED |

---

## 4. PII Protection, Tokenization & Column Masking

Sensitive data fields are dynamically masked based on the viewer's IAM role:

- **Bank Verification Number (BVN)**: Masked as `222*****891`.
- **National Identity Number (NIN)**: Masked as `109*****452`.
- **Bank / Customer Account Number**: Masked as `012*****90`.
- **Customer Phone Number**: Masked as `+234 803 **** 890`.
- **Full Name & Address**: Anonymized or pseudonymized in analytical marts unless explicit compliance clearance is granted.
