# Asset-Liability Management (ALM) & Behavioural Maturity Modeling

## 1. ALM Structural Balance Sheet
The ALM engine profiles the structural maturity and repricing behaviour of all balance sheet positions:

| Balance Sheet Component | Contractual Maturity | Behavioural Assumption |
| :--- | :--- | :--- |
| **Customer Digital Wallets** | On Demand ($T+0$) | $75\%$ Core Stable Float, $25\%$ Volatile Runoff |
| **Merchant Payables** | $T+1$ Settlement Cycle | $95\%$ Settled Daily, $5\%$ Rolling Reserve |
| **Agent Operational Float** | $T+0$ Revolving | Stable working capital with $15\%$ peak weekend runoff |
| **Providus / Coris Bank Nostro** | Overnight / Immediate | $100\%$ Liquid High-Quality Asset |
| **Commercial Bank Borrowings** | 12 - 36 Months Fixed/Floating | Contractual amortisation schedule |

---

## 2. Liquidity Gap & Repricing Gap Analysis
- **Contractual & Behavioural Maturity Ladders**: Bucketed into `0-1D`, `2-7D`, `8-30D`, `31-90D`, `91-180D`, `181-365D`, `1-2Y`, `2-5Y`, `5Y+`.
- **Funds Transfer Pricing (FTP)**:
  $$\text{Internal FTP Rate} = \text{Base Cost of Funds} + \text{Term Liquidity Premium} + \text{Credit/Risk Premium}$$
  Allocates capital costs accurately across business lines and banking products.
