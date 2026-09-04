# Identity Privacy Model & Data Classification

## 1. Data Classification Tiers

| Classification | Attributes Included | Encryption Standard | Access Policy | Retention Period |
|---|---|---|---|---|
| **PUBLIC** | Business Trading Name, Public Branch Locations | TLS 1.3 in transit | Unrestricted | Indefinite |
| **INTERNAL** | Internal Account Numbers, KYC Tier Level, Creation Dates | AES-256 at rest, TLS 1.3 | Authenticated Internal Roles | 7 Years post account closure |
| **CONFIDENTIAL** | Residential Address, Legal Business Name, Phone, Email | AES-256 at rest, TLS 1.3 | Need-to-know + RBAC | 7 Years (Regulatory Mandate) |
| **SENSITIVE** | National Identity Numbers (NIN, NINA, BVN), Passport Numbers | Column-level AES-256-GCM | Masked for all except MLRO | 7 Years post-relationship |
| **HIGHLY SENSITIVE**| Biometric Face Vectors, Passwords, PINs, Private Keys | Argon2id / Encrypted Vault | Strictly Zero Human Access | Deleted upon verification confirmation |

---

## 2. Privacy Rights & Regulatory Compliance
- Compliant with **Nigeria Data Protection Act (NDPA 2023)** and **WAEMU Personal Data Protection Framework (Niger Republic)**.
- **Data Minimization**: Only regulatory-mandated KYC attributes are collected.
- **Right to Rectification**: Handled through Maker-Checker profile change requests with historical versioning.
- **Legal Holds**: Records subject to active AML/SAR investigations are exempt from automated deletion schedules.
