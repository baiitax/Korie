# Physical Cash Liquidity, Buffer Matrices & Demand Forecasting

## 1. Multi-Tier Liquidity Control
The Liquidity Operations Engine continuously computes physical liquidity availability across all operational layers:

$$\text{Available Physical Liquidity} = \text{Total Physical Cash} - \text{Reserved Cash} - \text{Pending Collections} - \text{Safety Buffer}$$

### Liquidity State Evaluation:
- `HEALTHY`: Cash position $\ge 150\%$ of target safety buffer.
- `WATCH`: Cash position between $100\% - 150\%$ of buffer.
- `LOW`: Cash position between $50\% - 100\%$ of buffer (triggers automatic replenishment alert).
- `CRITICAL`: Cash position $< 50\%$ of buffer (requires urgent cash transfer).
- `RESTRICTED` / `EMERGENCY`: Operational limits enforced.

---

## 2. Statistical Demand Forecasting & Scenario Simulations
- **Forecast Horizons**: 1 Hour, 4 Hours, 24 Hours, 3 Days, 7 Days, 30 Days.
- **Forecasting Inputs**: Historical cash-in/out velocity, weekday/weekend seasonality, salary payout cycles, public holidays, and local market days.
- **Scenario Testing Engine**:
  - `SCENARIO_A`: $+20\%$ surge in customer cash-out withdrawals.
  - `SCENARIO_B`: Key regional CIT corridor shut down for 24 hours.
  - `SCENARIO_C`: Core settlement bank delayed batch clearance.
