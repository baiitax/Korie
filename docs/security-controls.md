# Security Controls & Anti-Tamper Enforcement

## 1. Threat Modeling & Attack Vectors

The KoriePay Risk & Treasury systems are hardened against 10 critical threat vectors:
1. **Account Takeover (ATO)**: Prevented via step-up challenges on new device/IP and cooling periods on credential changes.
2. **Credential Stuffing & Brute Force**: Mitigated via IP/device velocity counters and CAPTCHA escalation.
3. **Insider Fraud & Collusion**: Enforced via strict Maker-Checker dual authorization on hold releases, manual overrides, and treasury fundings.
4. **Settlement / Balance Manipulation**: Prohibited by deriving positions directly from immutable double-entry ledger lines.
5. **Replay Attacks**: Prevented by enforcing unique `Idempotency-Key` and `X-Correlation-ID` on all mutation endpoints.
6. **API Secret Leakage**: Zero API secret exposure; client UI consumes server-sanitized models.
7. **Privilege Escalation**: Supabase Row-Level Security (RLS) combined with server-side RBAC guards.
8. **Downstream Provider Spoofing**: Webhook HMAC-SHA256 signature verification.
9. **Transaction Cycling**: Agent float cycling detection triggers instant protective holds.
10. **Data Drift & Silent Failure**: Fail-safe default policies execute if risk engine or downstream providers time out.

---

## 2. Maker-Checker Segregation Matrix

| Operation | Maker Role | Checker Role | Dual-Key Enforced? |
|---|---|---|---|
| Release Risk Hold | `RISK_INVESTIGATOR` | `RISK_CHECKER` / `DIRECTOR` | **YES** (Maker != Checker) |
| Dismiss Fraud Case | `FRAUD_ANALYST` | `COMPLIANCE_LEAD` | **YES** (Maker != Checker) |
| Treasury Funding Transfer | `TREASURY_ANALYST` | `TREASURY_CHECKER` / `CFO` | **YES** (Maker != Checker) |
| Manual Risk Rule Override | `RISK_OFFICER` | `CHIEF_RISK_OFFICER` | **YES** (Maker != Checker) |
| Update FX Reference Rate | `BDC_OPERATOR` | `TREASURY_HEAD` | **YES** (Maker != Checker) |
