# Treasury Operational Controls & Maker-Checker Policies

## 1. Segregation of Duties & IAM Entitlements
- **Role Separation**: `TREASURY_ANALYST` (Maker) vs. `TREASURY_MANAGER` (Checker) vs. `GROUP_TREASURER` / `CFO` (Executive Approver).
- **Maker-Checker Thresholds**:
  - Up to ₦50,000,000 / 100,000,000 XOF: `MAKER` + `CHECKER`.
  - Above ₦50,000,000 / 100,000,000 XOF: `MAKER` + `CHECKER` + `CFO`.
- **No Self-Approval**: The initiator of any funding request, liquidity sweep, or ALM assumption change cannot approve their own deal.
