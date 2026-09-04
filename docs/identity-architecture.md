# Master Identity & Access Management Architecture

## 1. Architectural Mission
The **KoriePay Master Identity Platform** acts as the canonical, authoritative identity control plane across **Nigeria (NGN)** and **Niger Republic (XOF)**. It guarantees that every physical person and legal business maintains a single, unified master identity across all customer, agent, merchant, aggregator, BDC, and administrative touchpoints.

### Fundamental Control Plane Hierarchy
```
                    KORIEPAY CONTROL ARCHITECTURE
                       ┌───────────────────┐
                       │ IDENTITY / KYC    │
                       │ Who is this user? │
                       └─────────┬─────────┘
                                 │
                                 ▼
                       ┌───────────────────┐
                       │ AUTHENTICATION    │
                       │ Can they access?  │
                       └─────────┬─────────┘
                                 │
                                 ▼
                       ┌───────────────────┐
                       │ AUTHORIZATION     │
                       │ What can they do? │
                       └─────────┬─────────┘
                                 │
                                 ▼
                       ┌───────────────────┐
                       │ RISK / COMPLIANCE │
                       │ Is it safe/legal? │
                       └─────────┬─────────┘
                                 │
                                 ▼
                       ┌───────────────────┐
                       │ TRANSACTION CORE  │
                       └─────────┬─────────┘
                                 │
                                 ▼
                       ┌───────────────────┐
                       │ LEDGER (TRUTH)    │
                       └───────────────────┘
```

---

## 2. Master Identity Separation Principles
1. **Separation of Identity vs. Authentication vs. Authorization**:
   - **Identity**: "Who are you?" (Canonical person or organization entity).
   - **Authentication**: "Can you prove control of credentials?" (Passwords, MFA, PINs, Biometrics, WebAuthn).
   - **Authorization**: "What specific actions and financial limits are granted?" (RBAC/ABAC policies, KYC Tier limits).
2. **Decoupling Identity from Financial Truth**:
   - Identity changes, KYC upgrades, or verification failures never mutate or corrupt historical double-entry ledger postings, transaction references, or settled batches.
3. **Canonical Identifier Invariance (`KID-XXXXXXXX`)**:
   - Permanent internal identity references use opaque, immutable UUIDs and canonical prefixes (`KID-NG-XXXXXX`, `KID-NE-XXXXXX`).
   - Emails, phone numbers, BVNs, NINAs, and bank account numbers are subject to change and are never used as primary keys.
