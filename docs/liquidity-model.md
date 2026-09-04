# Liquidity Model & Mathematical Invariants

## 1. Authoritative Available Liquidity Formulation

Treasury enforces the non-negotiable rule that **total cash is never spendable cash**. Available liquid capital is derived strictly from ledger-backed balances using the formula:

$$\text{Available Liquidity} = \text{Eligible Bank Cash} + \text{Eligible Provider Cash} - \text{Restricted Funds} - \text{Committed Settlement Obligations} - \text{Rolling Reserves} - \text{Active Financial Holds}$$

### Classification of Funds
- **AVAILABLE**: Unencumbered, fully reconciled cash ready for payout or transfer.
- **RESTRICTED**: Collateral, regulatory statutory reserves, or escrow funds.
- **RESERVED**: Rolling reserves retained against merchant chargeback exposure (e.g. 5% 180-day reserve).
- **COMMITTED**: Settlement batches approved by Maker-Checker awaiting bank batch transmission.
- **PENDING**: Inward NIP or card clearing batches pending settlement cut-off.
- **EXPECTED**: High-confidence forecasted inflows based on historical trends.
- **UNAVAILABLE**: Frozen assets, disputed funds, or unverified suspense items.

---

## 2. Liquidity Horizon Buckets

Treasury schedules liquidity forecasts and cash flows into discrete time buckets:
1. `NOW`: Immediate available cash for instant processing (< 5 minutes).
2. `INTRADAY`: Projected position through the remainder of the current trading day.
3. `TODAY`: Closing balance position at day EOD cut-off (23:59:59).
4. `TOMORROW`: T+1 settlement disbursement requirements.
5. `T+2`: Rolling clearing requirements for international/card scheme settlements.
6. `7_DAYS`: One-week operational working float projection.
7. `30_DAYS`: Monthly liquidity run-rate and regulatory reserve assertions.
8. `90_DAYS`: Quarterly strategic liquidity buffers.

---

## 3. Liquidity Waterfall Prioritization

When liquidity pressure occurs, treasury prioritizes disbursements according to the policy hierarchy:
1. **Tier 1: Customer Protection Obligations** (Retail customer withdrawals & deposits).
2. **Tier 2: Critical Regulatory & Central Bank Reserves** (Statutory reserves, CBN/BCEAO compliance).
3. **Tier 3: Provider Gateway Funding** (Ensures continuous uptime on NIP switch & card acquirers).
4. **Tier 4: Merchant Settlement Obligations** (Verified commercial payouts).
5. **Tier 5: Agent Float Rebalancing** (Agency cash-in/cash-out liquidity).
6. **Tier 6: Operating Expense & Tax Obligations** (Internal corporate payments).
7. **Tier 7: Optional Inter-company Float Transfers** (Discretionary cross-border rebalancing).

---

## 4. Target Safety Buffer Formulation

$$\text{Target Buffer} = \text{Average Daily Outflows} \times \text{Buffer Multiplier (1.25)} + \text{Peak Volatility Delta}$$

If `Available Liquidity < Target Buffer`, an automated `LOW_LIQUIDITY` advisory alert is dispatched.
If `Available Liquidity < Committed Obligations`, a `CRITICAL_LIQUIDITY_SHORTFALL` alert is triggered.
