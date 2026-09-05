# Driver-Based Financial Planning, Budgeting & Profitability Economics

## 1. Driver-Based Budgeting Architecture
Financial projections are generated dynamically from underlying operational drivers:
- **Core Drivers**: Monthly Active Customers, Transaction Velocity per Customer, Average Transaction Value (ATV), Fee Take Rate, Active POS Agent Network Count, Commission Split Percentage, Interchange Rail Cost per Transfer, Cloud & Infrastructure Spend.
- **Budget Governance**: Multi-scenario versions (`BASE_CASE`, `UPSIDE`, `DOWNSIDE`, `BOARD_APPROVED_BUDGET`), with monthly Budget vs. Actual variance tracking.

---

## 2. Unit Economics & Contribution Margins
- **Product Profitability**: Computes revenue minus interchange fees, agent commissions, rail network costs, and funding cost per product line.
- **Agent Economics**: Evaluates gross fee revenue vs. commission payout vs. physical cash handling cost to compute net agent ROI.
- **Provider Economics**: Tracks Providus Bank, Coris Bank, Interswitch, and Paystack settlement fees vs. transaction success rates.
