# KORIEPAY AGGREGATOR SECURITY & ACCESS CONTROL
## Threat Modeling, Authentication, Hardware Integrity & Encryption

---

## 1. Security Architecture

- **Multi-Factor Authentication (MFA):** Mandatory for float distribution and bank payout execution.
- **PIN/OTP Dual Authorization:** High-value liquidity dispatches enforce maker-checker confirmation.
- **Session & Device Whitelisting:** Tracks hardware browser fingerprints and certified POS serials.
- **Data Protection:** Personal identifiers (BVN, NIN) and card PANs are masked in the presentation layer.

---

## 2. API Security Standards

- **HMAC SHA-256 Webhook Signatures:** Inbound events are validated using cryptographic signatures.
- **Secret Key Rotation:** Supported seamlessly with zero downtime in `/aggregator/developers`.
- **IP Subnet Geofencing:** Restricts management access to approved corporate IP ranges in Nigeria and Niger Republic.
