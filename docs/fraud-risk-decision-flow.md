# Fraud & Risk Decision Flow

## 1. High-Performance Evaluation Lifecycle

```
                      INCOMING TRANSACTION REQUEST
                                   │
                                   ▼
                   [1] Fast Path Authentication & Identity
                         (KYC Level, Account Age, Tier Limits)
                                   │
                                   ▼
                   [2] Signal Extraction & Feature Enrichment
                         (Device Hash, IP/ASN, Geo-Velocity, Beneficiary)
                                   │
                                   ▼
                   [3] Velocity Counter Evaluation (Redis / Memory)
                         (10-min count, 1-hour volume, 24-hour total)
                                   │
                                   ▼
                   [4] Deterministic Rule Engine Execution
                         (Pattern matching against active RiskRuleVersions)
                                   │
                                   ▼
                   [5] Composite Risk Score Aggregation (0 - 100)
                         Identity(15%) + Device(20%) + Network(15%) + 
                         Transaction(20%) + Velocity(20%) + Behavior(10%)
                                   │
                                   ▼
                   [6] Policy & Risk Band Mapping
                         0-19: VERY_LOW  → ALLOW
                        20-39: LOW       → ALLOW
                        40-59: MEDIUM    → ALLOW_WITH_STEP_UP
                        60-79: HIGH      → REVIEW / HOLD
                        80-94: VERY_HIGH → HOLD / DECLINE
                        95-100: CRITICAL → DECLINE / BLOCK
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
     [ALLOW]               [STEP_UP_CHALLENGE]             [HOLD / DECLINE]
        │                          │                          │
        │                          ▼                          ▼
        │                  Trigger OTP / PIN           Place Ledger Hold /
        │                  Challenge Verification     Emit Fraud Alert Case
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   │
                                   ▼
                   [7] Immutable Decision Logging & Audit
                         (Persist decision record & factor breakdown)
                                   │
                                   ▼
                   [8] Dispatch to Transaction Execution Core
```

---

## 2. Step-Up Authentication Flow
1. If decision is `ALLOW_WITH_STEP_UP`:
   - Transaction status set to `AWAITING_STEP_UP_VERIFICATION`.
   - Temporary cryptographic step-up challenge token issued (TTL: 300s).
   - User presented with SMS/Email OTP, PIN entry, or FIDO2/Biometric authentication.
   - Upon successful verification, transaction is re-evaluated and unlocked for processing.
   - If challenge fails 3 times or expires, risk decision escalates to `DECLINE` and profile risk score increases.

---

## 3. Risk Hold & Maker-Checker Release Flow
1. If decision is `HOLD`:
   - Core Financial Engine places transaction funds into locked reserve holding.
   - Fraud Operations case generated automatically with SLA timer.
   - Case assigned to Fraud Investigation Desk.
   - Release requires **Dual-Key Maker-Checker Authorization**:
     - Maker: Investigating fraud officer reviews telemetry and files release justification.
     - Checker: Lead risk officer / Risk Director reviews evidence and signs off.
   - Upon Checker approval, the Financial Hold is released in the Ledger and transaction is either completed or refunded.
