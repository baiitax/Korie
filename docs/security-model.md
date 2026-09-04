# Security Model & Server-Side Policy Gateway

## 1. Centralized Policy Gateway
Every incoming transaction must pass the deterministic evaluation gateway before execution:

```
CanCustomerPerformAction(
  customer,
  account,
  product,
  transaction,
  device,
  beneficiary,
  jurisdiction
)
```

## 2. Decision Tree
1. **Identity & KYC**: Is customer `ACTIVE` and KYC valid for transaction size?
2. **Account Status**: Is account `OPEN` and unrestricted for this transaction direction?
3. **Product Policy**: Is transaction type permitted under enrolled product?
4. **Limits & Velocity**: Does transaction exceed single or daily cumulative limits?
5. **Device Trust**: Is device trust score $\ge 70$?
6. **Beneficiary Risk**: Has beneficiary passed 24h cooldown?
7. **Risk Engine**: Is fraud risk evaluation within tolerable bounds?

Result: `ALLOW` | `STEP_UP` | `REVIEW` | `DECLINE`.
