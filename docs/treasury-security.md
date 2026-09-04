# Treasury Security, Telemetry & Anti-Tamper Safeguards

## 1. Privileged Treasury Security Architecture
- **MFA & Hardware Keys**: WebAuthn / FIDO2 hardware tokens mandatory for all wholesale funding and intercompany liquidity authorizations.
- **Immutable Audit Logging**: Every deal ticket submission, assumption modification, and scenario execution records cryptographic hash receipts in the append-only audit trail.
- **Anomalous Movement Detection**: Real-time correlation with Fraud/AML engines detects unexpected large-volume transfers or rapid velocity changes.
