# Credit Facilities, Wholesale Funding & Deal Tickets

## 1. Credit Facility Master Registry
KoriePay maintains institutional wholesale funding relationships:
- **Commercial Bank Credit Lines**: Providus Bank (₦5,000,000,000 revolving credit), Coris Bank SA (10,000,000,000 XOF liquidity backstop).
- **Facility Governance**: Tracks committed limits, current utilization, undrawn headroom, interest spread ($+\text{SOFR} / +\text{MPR}$), upfront commitment fees, and financial covenants (e.g. minimum liquidity buffer $> 20\%$).

---

## 2. Maker-Checker Funding Deal Tickets
All funding drawdowns, capital injections, and debt service repayments require dual-authorization:
$$\text{PROPOSED} \rightarrow \text{TREASURY\_REVIEW} \rightarrow \text{RISK\_CHECK} \rightarrow \text{APPROVED} \rightarrow \text{EXECUTED} \rightarrow \text{SETTLED} \rightarrow \text{RECONCILED}$$
- Financial postings create immutable balanced journal entries (`Debit 1010 Bank Nostro` $\longleftrightarrow$ `Credit 2200 Wholesale Borrowings`).
