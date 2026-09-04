# Enterprise IAM, Zero-Trust Architecture & Identity Separation

## 1. Architectural Scope & Control Plane
KoriePay implements an enterprise-grade Identity and Access Management (IAM) and Zero-Trust control plane. The IAM layer governs every workforce identity, machine service account, and privileged operational request across Nigeria (NGN) and Niger Republic (XOF) corridors.

```
+-----------------------------------------------------------------------------------------+
|                                    KORIEPAY ZERO-TRUST IAM                              |
+-----------------------------------------------------------------------------------------+
|  IDENTITY  ->  AUTHENTICATION  ->  DEVICE TRUST  ->  SESSION  ->  RBAC + ABAC           |
|     |                |                  |               |            |                  |
|  Workforce        MFA / AAL3        Hardware /       Durable     Resource & Scope       |
|  & Service        WebAuthn           Posture        Timeout      Attribute Controls     |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                             PRIVILEGED ACCESS & GOVERNANCE                              |
|  Maker-Checker Dual Custody  |  Just-In-Time (JIT) Elevation  |  Break-Glass Emergency  |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                               SECURITY OPERATIONS & SIEM                                |
|  Security Event Ingestion  ->  Rule Detection Engine  ->  Alerts & Incident Playbooks   |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Segregation of Workforce vs. Customer Identity
1. **Workforce Identity Domain**:
   - Covers internal personnel: `STAFF`, `OPERATIONS`, `FINANCE`, `COMPLIANCE`, `AML`, `RISK`, `TREASURY`, `SUPPORT`, `ENGINEERING`, `SECURITY`, `AUDITOR`, `ADMIN`, `SUPER_ADMIN`.
   - Strictly managed via enterprise lifecycle states (`INVITED`, `PENDING_ACTIVATION`, `ACTIVE`, `SUSPENDED`, `LOCKED`, `RESTRICTED`, `OFFBOARDED`, `DELETED_REFERENCE_ONLY`).
   - Governed by hardware-bound MFA (AAL2/AAL3), device trust posture, and strict inactivity timeouts.
2. **Customer Identity Domain**:
   - Covers consumer, merchant, and agent identities transacting on the payment rail.
   - Decoupled from administrative infrastructure and internal role bindings.
3. **Machine / Service Accounts**:
   - Dedicated service accounts (`SERVICE_ACCOUNT`, `SYSTEM`) with defined owners, cryptographic key rotation, explicit scopes, and zero human interactive login capabilities.

---

## 3. Authentication Assurance Levels (AAL)
- **AAL1 (Standard Password / Single Factor)**: Basic read-only access to unclassified general dashboards.
- **AAL2 (Standard MFA / TOTP / Push)**: Standard workforce operations, ticket handling, customer support triaging.
- **AAL3 (Hardware-Bound FIDO2 / WebAuthn / Passkey)**: Mandatory for all financial approvals, treasury rebalancing, AML case decisions, account freezes, role changes, and production administrative actions.

---

## 4. Centralized Session & Token Management
- **Cryptographic Ephemeral Sessions**: Sessions store zero raw secrets. Tracked with `session_id`, `user_id`, `aal_level`, `device_id`, `ip_context`, `created_at`, `last_seen_at`, and `expires_at`.
- **Inactivity & Absolute Timeouts**:
  - Workforce Standard Session: 15-minute inactivity timeout, 8-hour absolute maximum.
  - Privileged / Production Session: 5-minute inactivity timeout, 1-hour maximum with JIT re-authentication.
- **Instant Revocation Cascade**: Offboarding an identity or triggering containment immediately invalidates all active sessions, refresh tokens, JIT elevation tokens, and API credentials.
