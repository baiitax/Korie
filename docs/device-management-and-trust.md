# Device Management Platform & Trust Scoring Engine

## 1. Zero-Trust Internal Device Identity
Never rely solely on ephemeral browser headers or spoofable client data. Every device interacting with KoriePay is registered with:
- `device_id`: Canonical internal UUID
- `device_public_key`: Client-generated asymmetric key pair (Ed25519 / RSA-2048)
- `attestation_status`: Hardware security module attestation (Google Play Integrity / Apple DeviceCheck)
- `trust_status`: `TRUSTED` | `NORMAL` | `ELEVATED_RISK` | `HIGH_RISK` | `COMPROMISED` | `BLOCKED`

---

## 2. Dynamic Device Trust Score (0 - 100)
Evaluated in real-time across 8 behavioral dimensions:
1. Registration Age & Nonce Continuity
2. Jailbreak / Root / Tampering Signals
3. Geolocation & Impossible Travel Vectors
4. App Version & Security Patch Currency
5. Failed Authentication Velocity
6. Rapid SIM / IMEI Mutation Anomaly
7. Transaction Volume Outlier Pattern
8. Account Takeover (ATO) Heuristics
