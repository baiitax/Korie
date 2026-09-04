# Adashi Product Factory & Configurable Financial Rules

## 1. Product Template Specifications

The Adashi Product Factory enables KoriePay and authorized Master Agents to deploy standardized rotating savings products without hardcoding business rules:

| Product Code | Name | Currency | Contribution | Frequency | Member Limits | Grace Period | Agent Commission |
|---|---|---|---|---|---|---|---|
| `PRD-ADA-KAN-WK` | Kano Traders Weekly Market Adashi | NGN | ₦20,000 | WEEKLY | 10–20 Members | 24 Hours | 1.0% of Payout |
| `PRD-ADA-LAG-MO` | Alaba Wholesale Monthly Ajo | NGN | ₦100,000 | MONTHLY | 5–12 Members | 48 Hours | 0.8% of Payout |
| `PRD-ADA-MAR-WK` | Maradi Border Cross-Trade Adashi | XOF | 25,000 XOF | WEEKLY | 8–15 Members | 24 Hours | 1.2% of Payout |
| `PRD-ADA-NIAM-MO`| Niamey SME Corporate Tontine | XOF | 150,000 XOF | MONTHLY | 6–10 Members | 48 Hours | 0.75% of Payout |

---

## 2. Product Lifecycle State Machine

```
[DRAFT] ──▶ [UNDER_REVIEW] ──▶ [APPROVED] ──▶ [ACTIVE] ──▶ [SUSPENDED] ──▶ [RETIRED]
```

- **Version Immutability**: Active product versions are immutable. Changes generate a new version increment (`v1.0` $\rightarrow$ `v1.1`) preserving historical contracts for running Adashi groups.
- **Consumer Protection Disclosures**: Every product template requires clear disclosure of all fees, contribution deadlines, default penalty rules, and dispute resolution channels.
