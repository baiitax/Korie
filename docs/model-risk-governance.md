# Model Risk Governance & Quantitative Validation

## 1. Model Inventory & Lifecycle
All automated decision models (Credit, Fraud, AML Scenario Thresholds, Cash Demand Forecasting) are governed under formal lifecycle stages:
$$\text{DEVELOPMENT} \longrightarrow \text{INDEPENDENT\_VALIDATION} \longrightarrow \text{COMMITTEE\_APPROVAL} \longrightarrow \text{SHADOW\_MODE} \longrightarrow \text{PRODUCTION} \longrightarrow \text{MONITORING}$$

---

## 2. Model Performance Tracking & Expiry
- **Validation Frequency**: Annual independent validation by Risk Engineering.
- **Drift & Degradation Signals**: Real-time tracking of False Positive Ratios, Prediction Error Rates, and Population Stability Index (PSI).
- **Prohibition on Unapproved Models**: Automated scoring models cannot execute in production without committee sign-off.
