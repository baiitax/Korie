# KORIEPAY API AUTHENTICATION & CREDENTIAL LIFECYCLE

## 1. Authentication Scheme
All requests must transmit a Bearer Token in the HTTP `Authorization` header:

```http
Authorization: Bearer kp_live_992817a02b1c3d4e5f6a7b8c9d0e1f2a
Content-Type: application/json
Accept: application/json
```

---

## 2. Key Categories & Scopes
- `pk_test_...` / `pk_live_...`: Public keys (safe for mobile frontends and checkout SDK initialization).
- `kp_test_...` / `kp_live_...`: Secret keys (strictly restricted to backend servers).

### Scoped Permissions (Least Privilege)
- `payments:read`, `payments:write`
- `transfers:write`
- `wallets:read`, `wallets:write`
- `kyc:verify`
- `agency:write`

---

## 3. Zero-Downtime Key Rotation
When rotating keys:
1. Generate new active credential `kp_live_v2_...`.
2. Old credential enters `ROTATING` state with a **7-day grace period**.
3. Merchant updates server environment configurations.
4. Old credential is permanently revoked at grace period expiry.
