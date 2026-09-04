# Enterprise Risk-Control Matrix (RCM) & Dynamic Scoring

## 1. Risk Scoring & Quantification Model
Every identified enterprise risk is evaluated across 10 impact dimensions (Financial, Customer, Regulatory, Operational, Reputational, Legal, Cyber, Liquidity, Capital, Strategic):

$$\text{Inherent Risk Score} = \text{Likelihood } (1 - 5) \times \text{Impact } (1 - 5) \quad \left[\text{Range: } 1 - 25\right]$$
$$\text{Residual Risk Score} = \text{Inherent Risk} \times \left(1 - \text{Control Effectiveness Percentage}\right)$$

### Control Effectiveness Criteria:
- `EFFECTIVE`: $100\%$ control coverage and continuous automated testing passes ($0.80 - 1.00$ mitigation factor).
- `PARTIALLY_EFFECTIVE`: Minor exceptions found during audit sampling ($0.40 - 0.79$ mitigation factor).
- `INEFFECTIVE`: Control failed or missing ($0.00$ mitigation factor $\implies$ Residual Risk equals Inherent Risk).
- `NOT_TESTED`: Requires testing before control credit is recognized.
