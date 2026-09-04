# Identity Security Model & Role-Based Access Control

## 1. Authentication Separation vs Authorization
- **Identity Level**: Verified Person or Business (`KID-XXXXXXXX`).
- **Authentication Level**: Supabase Auth + Multi-Factor Authentication (TOTP / SMS OTP / FIDO2 WebAuthn).
- **Authorization Level**: Granular RBAC + ABAC evaluated server-side on every request.

---

## 2. Granular Role-Based Access Control (RBAC) Matrix

| Portal / Role | Identity Read | Identity Edit | KYC Document View | KYC Approve / Reject | Financial Mutations |
|---|---|---|---|---|---|
| **Customer** | Own Profile | Restricted Fields | Own Documents | No | Within Tier Limits |
| **Agent** | Own Profile | Restricted Fields | Own Documents | No | Within Agent Limits |
| **Merchant** | Own Organization | Business Info | Own KYB Docs | No | Payout / Checkout |
| **Compliance Officer** | All (Jurisdiction) | No | Full Decrypted | Maker Recommend | No |
| **Compliance Lead / MLRO** | All | Override | Full Decrypted | Checker Sign-off | No |
| **Support Officer** | Masked PII Only | No | Metadata Only | No | No |
| **Super Admin** | All | Dual-Control | All | Dual-Control | Dual-Control |

---

## 3. PII Masking Standards
- **National Identity Numbers (NIN/NINA)**: `*******4821` (Only last 4 digits visible to non-MLRO roles).
- **Bank Verification Numbers (BVN)**: `*******9012`.
- **Card Numbers (PAN)**: `5399-83**-****-1029`.
- **Phone Numbers**: `+234-80****-9921`.
- **Full PII View**: Logged into `identity_audit_log` with mandatory reason code and actor signature.
