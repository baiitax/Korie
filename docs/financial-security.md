# Financial Security & PII Data Protection

## 1. Zero Trust Architecture
All core financial APIs enforce strict authentication, HMAC SHA-256 signature verification, and field-level data minimization.

## 2. PII Masking & Data Minimization
- **Bank Account Numbers**: Only the first 3 and last 4 digits are visible in logs and admin UI (`012****6789`).
- **Cardholder Data**: Full PAN, CVV, and PINs are never persisted in the database. Tokenized PCI-DSS references are used exclusively.
- **API Secret Keys**: Stored as one-way PBKDF2 / Argon2 hashes. Plaintext keys are shown only once upon generation.

## 3. Database Row Level Security (RLS)
Multi-tenant isolation is enforced at the PostgreSQL kernel level. Organization queries automatically attach tenant filters (`organization_id = auth.jwt().org_id`).
