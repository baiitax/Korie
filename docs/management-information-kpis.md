# Enterprise Management Information & Executive KPI Governance

## 1. Multi-Dimensional Management Information (MI)

The KoriePay MI Platform aggregates authoritative operational facts across 8 key operational domains to provide C-Suite executives with real-time performance telemetry.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EXECUTIVE PERFORMANCE COCKPIT                           │
│   CEO • CFO • CRO • COO • VP Growth • Head of Treasury • Head of Compliance │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
      ┌────────────────────────────────┼────────────────────────────────┐
      │                                │                                │
┌─────▼──────────────┐       ┌─────────▼────────────┐       ┌───────────▼───────────┐
│ FINANCIAL & GROWTH │       │ OPERATIONAL & SWITCH │       │ RISK, AML & TREASURY  │
│ Revenue, Net Margin│       │ Success Rate, Latency│       │ Buffer Ratio, Fraud   │
│ EBITDA, ROA, ARPU  │       │ Settlement Breaks    │       │ AML Backlog, VaR      │
└────────────────────┘       └──────────────────────┘       └───────────────────────┘
```

---

## 2. Governed Executive KPI Catalog

| KPI Code | Name | Domain | Technical Formula | Target | Warning | Critical | Owner |
|---|---|---|---|---|---|---|---|
| `KPI-REV-001` | Monthly Gross Revenue | Financial | `SUM(gl_account_4000_revenue)` | ₦4.20B | < ₦3.80B | < ₦3.50B | CFO |
| `KPI-EBT-001` | EBITDA Margin % | Financial | `(EBITDA / Gross Revenue) * 100` | 28.0% | < 22.0% | < 18.0% | CFO |
| `KPI-TXV-001` | Gross Transaction Volume | Payments | `SUM(successful_transactions.amount)` | ₦185.0B| < ₦150.0B| < ₦120.0B| COO |
| `KPI-SWS-001` | Core Switch Uptime & Success | Operations| `(Successful Txs / Total Attempts) * 100` | 99.85% | < 99.50% | < 99.00% | VP Eng |
| `KPI-AGT-001` | Active Agent Outlets (30D) | Agency | `COUNT(DISTINCT agent_id with txs >= 1)`| 45,000 | < 38,000 | < 30,000 | Head Agent|
| `KPI-LIQ-001` | Liquidity Buffer Coverage | Treasury | `(Liquid Assets / 30D Stressed Outflows) * 100`| 150.0% | < 120.0% | < 100.0% | Treasurer |
| `KPI-FRD-001` | Net Fraud Loss (bps) | Risk | `(Net Fraud Loss / GTV) * 10000` | < 0.5 bps| > 1.0 bps| > 1.5 bps | CRO |

---

## 3. Actual vs. Budget vs. Forecast Variance Analysis

The system supports real-time multi-scenario comparative modeling:

- **`ACTUAL`**: Incurred financial postings from the double-entry general ledger.
- **`BUDGET`**: Annual board-approved operational budget.
- **`FORECAST`**: Re-forecasted projections across 4 scenarios (`BASE`, `UPSIDE`, `DOWNSIDE`, `STRESS`).
- **Variance Calculations**:
  $$\text{Variance} = \text{Actual} - \text{Budget}$$
  $$\text{Variance \%} = \left(\frac{\text{Actual} - \text{Budget}}{\text{Budget}}\right) \times 100$$
