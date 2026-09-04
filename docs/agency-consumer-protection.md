# Consumer Protection, Complaint Management & Financial Redress

## 1. Consumer Protection Architecture
Agency banking consumers are protected against agent misconduct, unrendered services, fee overcharging, and POS cash dispense failures.

### Standardized Grievance Categories:
- `DUPLICATE_DEBIT`: Card debited multiple times during single POS transaction.
- `CASH_NOT_DISPENSED`: Electronic debit successful but physical cash withheld by agent.
- `AGENT_OVERCHARGING`: Unofficial cash surcharge demanded above published tariffs.
- `UNAUTHORIZED_TRANSACTION`: Potential card skim or credential compromise.

---

## 2. Statutory SLA Clocks & Authoritative GL Redress
- **Statutory Resolution SLA**: P0 Critical claims (e.g. unauthorized debits) carry a strict 24-hour resolution deadline.
- **Financial Redress Posting**: Approved consumer compensation is posted as an immutable double-entry journal:
  $$\text{Debit: Operating Redress Expense (5010)} \longleftrightarrow \text{Credit: Customer Wallet (2010/2020)}$$
