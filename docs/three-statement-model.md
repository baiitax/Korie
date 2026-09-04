# Integrated Three-Statement Financial Model (P&L, Balance Sheet, Cash Flow)

## 1. Dynamically Linked 3-Statement Architecture
The forward-looking financial planning engine binds the three core accounting statements:

```
[1. INCOME STATEMENT (P&L)]
Revenue (Transfer Fees, FX Spreads, Merchant MDR)
  - Direct Operating Expenses (Interchange, Agent Commissions, Switch Fees)
  = GROSS CONTRIBUTION MARGIN
  - Operating Overhead (Engineering, Compliance, G&A)
  - Wholesale Funding Interest Expense
  = NET PROFIT BEFORE TAX
       │
       ▼ (Retained Net Profit)
[2. BALANCE SHEET]
Assets (Bank Nostro, Float, CIT Cash, Receivables)
  = Liabilities (Customer Deposits, Merchant Payables, Wholesale Debt)
    + Equity (Paid-up Capital, Retained Earnings + Current Net Profit)
       │
       ▼ (Working Capital & Capex Delta)
[3. CASH FLOW STATEMENT]
Operating Cash Flow + Investing Cash Flow + Financing Cash Flow
  = Net Change in Available Treasury Cash
```

---

## 2. Inviolable Accounting Invariant
$$\text{Total Assets} \equiv \text{Total Liabilities} + \text{Total Shareholders' Equity}$$
Every forward projection strictly enforces balance sheet equality across all forecast horizons (30 days, 90 days, 12 months, 36 months).
