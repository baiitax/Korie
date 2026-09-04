# API Security, Credential Vaulting & Key Rotation

## 1. Secret Vaulting & Cryptographic Storage
- Raw API keys (`kp_live_...`, `pk_live_...`) are displayed to developers exactly once upon generation.
- The platform stores only the SHA-256 hash `HMAC_SHA256(Secret)` and metadata in the database.
- Zero secrets are ever embedded in frontend bundles, public repositories, or client-side logs.

---

## 2. Key Rotation with Overlapping Grace Windows
To ensure zero service downtime during routine or emergency key rotation:
1. New API key generated and placed in `ACTIVE` state.
2. Old API key transitioned to `ROTATION_PENDING` with a 72-hour grace window.
3. Both keys are valid for authentication during the window.
4. Upon expiration, the old key is permanently `REVOKED`.
