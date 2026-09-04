# KORIEPAY API SECURITY & COMPLIANCE ARCHITECTURE

## 1. Zero Trust Principles
- **IP Address Whitelisting**: Production traffic is strictly filtered by merchant server egress IP addresses.
- **Data Minimization**: Secret keys and sensitive attributes are hashed using PBKDF2/SHA-256 and never recoverable in plaintext from UI.
- **Anti-IDOR Controls**: All resource queries are strictly scoped to the authenticated Organization ID and Application ID.
- **MFA Enforcement**: Mandatory Multi-Factor Authentication (TOTP / WebAuthn) for key rotation and production access.

---

## 2. Regulatory Alignment
- **Nigeria**: Central Bank of Nigeria (CBN) Open Banking and NDPR data protection rules.
- **Niger Republic**: BCEAO WAEMU microfinance and CENTIF AML regulations.
