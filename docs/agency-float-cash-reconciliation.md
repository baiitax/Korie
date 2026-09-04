# Agent Float Operations & Physical Cash Reconciliation

## 1. Physical Cash vs. Digital Float Model
- **Electronic Float Subledger**: Represents pre-funded digital liquidity maintained in the Core Ledger (`2010` NGN / `2020` XOF).
- **Physical Cash Position**: Represents physical banknotes held in the agent's cash drawer / till.
  $$\text{Expected Closing Cash} = \text{Opening Cash} + \text{Cash Inflows (Cash-In)} - \text{Cash Outflows (Cash-Out)} \pm \text{Approved Adjustments}$$

---

## 2. Daily Cash Counts & Exception Resolution
- Agents submit end-of-day denomination tallies (e.g. ₦1,000 $\times 500$, ₦500 $\times 200$, etc.).
- **Variance Handling**:
  - `MATCHED`: $\text{Physical Count} == \text{Expected Cash}$.
  - `SHORT` / `OVER`: Automatically generates a `CASH_RECONCILIATION_EXCEPTION`. Adjusting entries require Maker-Checker supervisor sign-off before posting to the ledger.
