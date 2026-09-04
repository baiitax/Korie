# Multi-Dimensional Versioned Limit Engine

## 1. Limit Architecture
Limits are defined per Product, KYC Tier, Customer Segment, and Risk Tier:

| Dimension | Tier 1 (Basic) | Tier 2 (Verified BVN/NINA) | Tier 3 (Full KYB/Address) |
|---|---|---|---|
| **Max Single Transfer (NGN)** | ₦50,000 | ₦200,000 | ₦5,000,000 |
| **Max Daily Cumulative (NGN)** | ₦300,000 | ₦1,000,000 | ₦25,000,000 |
| **Max Single Transfer (XOF)** | 100,000 CFA | 500,000 CFA | 10,000,000 CFA |
| **Max Daily Cumulative (XOF)** | 600,000 CFA | 2,500,000 CFA | 50,000,000 CFA |
| **Max Cumulative Balance** | ₦300,000 / 600,000 CFA | ₦1,500,000 / 3,000,000 CFA | Unlimited |

---

## 2. Maker-Checker Limit Overrides
Temporary or permanent limit overrides require:
- Stated justification and documentary evidence.
- Dual approval (Maker: Risk Analyst, Checker: Chief Risk Officer).
- Specific expiration timestamp (default: 30 days).
