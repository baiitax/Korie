# MLOps Model Registry, Lifecycle & Drift Surveillance

## 1. Enterprise Model Registry

All statistical and machine learning models deployed across KoriePay are registered in the centralized model catalog:

| Model ID | Model Name | Domain | Architecture | Version | Status | Primary Metric | Owner |
|---|---|---|---|---|---|---|---|
| `MDL-CLV-01` | Customer Lifetime Value Predictor | Customer | LightGBM Regressor | v2.1.0 | PRODUCTION | RMSE = 0.042 | Head of Analytics |
| `MDL-CHN-01` | Customer Churn Risk Classifier | Customer | XGBoost Classifier | v2.4.1 | PRODUCTION | AUC-ROC = 0.912 | Customer Intel Desk |
| `MDL-FCST-01`| 30D Revenue & Volume Forecaster | Financial | ARIMA + Seasonal Holt-Winters | v1.8.0 | PRODUCTION | MAPE = 2.4% | Financial Planning |
| `MDL-CSH-01` | Agent & Vault Cash Demand Forecaster| Treasury | Multi-Variable Regression | v1.5.0 | PRODUCTION | MAPE = 3.1% | Treasury Lead |
| `MDL-PRV-01` | Provider Latency Degradation Detector| Operations| Isolation Forest | v1.2.0 | PRODUCTION | F1-Score = 0.94 | Core SRE Lead |

---

## 2. Model Drift & Performance Degradation Telemetry

Models are evaluated continuously against live warehouse facts:
- **Concept Drift**: Evaluates divergence in target metric distributions (Kolmogorov-Smirnov test).
- **Data & Feature Drift**: Tracks Population Stability Index (PSI) on incoming feature snapshots. If $PSI > 0.25$, an automated warning is generated and shadow retraining is triggered.
- **Champion / Challenger Deployment**: New candidate models run in shadow mode for 30 days before being promoted to Champion status.
