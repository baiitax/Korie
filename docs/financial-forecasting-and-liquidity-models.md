# Financial Forecasting & Predictive Liquidity Models

## 1. Multi-Horizon Forecasting Engine

The forecasting engine generates rolling financial and operational projections across 4 discrete time horizons:
- **7-Day Tactical Horizon**: Intraday liquidity, daily agent cash demand, weekend settlement requirements.
- **30-Day Operational Horizon**: Monthly revenue projections, interchange costs, partner fee accruals.
- **90-Day Quarterly Horizon**: Budget variance tracking, seasonal agricultural cash cycle adjustments.
- **12-Month Strategic Horizon**: Capital adequacy runway, group ALM projections.

---

## 2. Pluggable Statistical & ML Models

1. **Holt-Winters Exponential Smoothing**: Captures day-of-week and month-end salary surge seasonality.
2. **Auto-Regressive Integrated Moving Average (ARIMA)**: High-precision trend forecasting for fee revenues.
3. **Ensemble Regressor (LightGBM / XGBoost)**: Ingests macro factors (FX fixing, bank holidays, regional outages).

---

## 3. Liquidity Demand Forecasting (Providus & Koris)

- **Providus Bank (NGN)**: Projects intraday NIP clearing outflows and NGN settlement buffers.
- **Coris Bank (XOF)**: Forecasts cross-border remittance corridor volume (Kano $\leftrightarrow$ Maradi $\leftrightarrow$ Niamey) and regional vault restocking needs.
- **Confidence Intervals**: All forecasts expose $P_{10}$ (Lower Bound), $P_{50}$ (Expected Median), and $P_{90}$ (Stressed Upper Bound) with calculated Mean Absolute Percentage Error (MAPE).
