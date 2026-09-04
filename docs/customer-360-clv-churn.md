# Customer 360 Intelligence, RFM, CLV & Churn Prediction

## 1. Customer 360 Analytical Profile

The Customer 360 layer aggregates multi-domain customer behavior without altering the authoritative customer master:

- **Identity & KYC**: KYC Level (Tier 1/2/3), Verification Status, Jurisdiction (NGN / XOF).
- **Financial Activity**: 30D/90D Inflow, Outflow, Average Transaction Value, Primary Transaction Channels.
- **Service & Experience**: Transaction failure rate, disputed transactions, open support tickets, resolution satisfaction.
- **Risk Telemetry**: Fraud score baseline, AML transaction velocity, device association count.

---

## 2. RFM Segmentation Model

Customers are dynamically scored across three dimensions on a 1–5 scale:
- **Recency ($R$)**: Days since last completed transaction.
- **Frequency ($F$)**: Total transaction count within rolling 90 days.
- **Monetary ($M$)**: Total gross transaction volume within rolling 90 days.

### Behavioral Segments:
- `CHAMPIONS` ($RFM \ge 444$)
- `LOYAL_CUSTOMERS` ($R \ge 3, F \ge 4$)
- `POTENTIAL_GROWTH` ($R \ge 4, F \le 2$)
- `AT_RISK` ($R \le 2, F \ge 3, M \ge 3$)
- `DORMANT` ($R = 1, F = 1, M = 1$)

---

## 3. Customer Lifetime Value (CLV) & Profitability

$$\text{Contribution Margin} = \text{Gross Fee Revenue} - \text{Interchange Costs} - \text{Provider Fees} - \text{Agent Commissions} - \text{Direct Servicing Costs}$$

$$\text{Predicted CLV} = \sum_{t=1}^{T} \frac{\text{Expected Contribution Margin}_t \times \text{Retention Rate}_t}{(1 + \text{Discount Rate})^t}$$

---

## 4. Churn Risk Engine

- **Model Type**: Gradient Boosted Decision Trees (XGBoost) + Logistic Regression baseline.
- **Key Features**: Days since last transaction, transaction frequency decline rate, recent failed payments, unresolved disputes.
- **Output**: `churn_probability` (0.00 to 1.00), `risk_band` (`LOW`, `MEDIUM`, `HIGH`), top 3 contributing drivers.
