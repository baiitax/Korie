# Dynamic Product Eligibility Engine

## 1. Multi-Factor Evaluation Matrix
When an account opening or product enrollment is requested, the Eligibility Engine evaluates:
1. **Jurisdiction & Legal Residency**: `NG` vs `NE`.
2. **KYC / KYB Tier**: `TIER_1` (Basic NIN/Phone), `TIER_2` (BVN/NINA), `TIER_3` (Verified Utility & Proof of Address).
3. **Customer Segment**: `PERSONAL`, `SME`, `CORPORATE`, `AGENT`, `MERCHANT`.
4. **Risk Scoring**: Evaluated against the Fraud/Risk Engine ($\text{Score} < 70$ for Tier-2+ accounts).
5. **Sanctions & PEP Status**: Clear screening record required.

---

## 2. Decision Codes
- `ELIGIBLE`: Product available for immediate self-service activation.
- `INELIGIBLE`: Hard requirement failure (e.g. invalid residency or currency).
- `REVIEW_REQUIRED`: Step-up verification or Compliance Maker-Checker sign-off required.
- `RESTRICTED`: Customer restricted under active AML or Fraud case.
