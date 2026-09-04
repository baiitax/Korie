# KORIEPAY SECURITY, IAM & DEFENSE-IN-DEPTH ARCHITECTURE

## 1. Multi-Layered Defense Model

```
+-------------------------------------------------------------------------+
| Layer 1: Edge Perimeter (WAF, DDoS mitigation, TLS 1.3, CSP Headers)    |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
| Layer 2: API Gateway (HMAC Signatures, IP Whitelist, Rate Limiting)    |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
| Layer 3: IAM & Scoped RBAC (Least-Privilege Scopes, Multi-Factor Auth) |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
| Layer 4: Application Domain (Idempotency Locks, PII Data Minimization)  |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
| Layer 5: PostgreSQL Database (Row Level Security, Append-Only Triggers) |
+-------------------------------------------------------------------------+
```

---

## 2. Secrets Management & Zero Credential Leaks
- All API secrets (`kp_live_...`) are hashed using PBKDF2/SHA-256 before persistence.
- Supabase `service_role` keys are strictly forbidden from frontend bundles.
- PII fields (BVN, NIN, PANs) are automatically masked in logs and responses.
