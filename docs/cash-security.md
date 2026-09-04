# Physical Cash Security, Threat Signals & SOC Telemetry

## 1. Physical Security Event Normalization
Every physical security event is normalized and forwarded to KoriePay's Security Operations Center (SOC) and Fraud/Risk engines:
- `VAULT_UNAUTHORIZED_ACCESS_ATTEMPT`: Biometric/MFA failure at vault door.
- `CIT_SEAL_INTEGRITY_MISMATCH`: Tampered or replaced bag seal.
- `CIT_ROUTE_DEVIATION`: Armored vehicle deviation $> 2\text{ km}$ from approved geo-corridor.
- `SUSPICIOUS_CASH_VELOCITY`: Rapid repeated cash deposits just below AML reporting thresholds.
- `COUNTERFEIT_NOTE_DETECTION`: Suspected counterfeit banknotes discovered during count.

---

## 2. Hardened Access Control & Zero-Trust Verification
- **Strict Separation of Duties**: Cash Custodians, Tellers, Approvers, Reconcilers, and Auditors maintain strictly separated role entitlements.
- **Hardware Cryptography**: All cash management apps authenticate with device hardware fingerprints and mTLS certificates.
