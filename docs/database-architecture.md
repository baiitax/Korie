# KORIEPAY TIER-1 FINTECH: CENTRAL DATABASE ARCHITECTURE

## 1. Architectural Topology & Supabase PostgreSQL Core

```
                                  +---------------------------------------+
                                  |            CLIENT PORTALS             |
                                  | Customer • Agent • Merchant • Support |
                                  +---------------------------------------+
                                                      │
                                                      ▼
                                  +---------------------------------------+
                                  |        SECURE API GATEWAY / EDGE      |
                                  | Rate Limiting • IAM • Idempotency     |
                                  +---------------------------------------+
                                                      │
                                                      ▼
                                  +---------------------------------------+
                                  |         DOMAIN SERVICE LAYER          |
                                  |  LedgerService • TransactionService   |
                                  +---------------------------------------+
                                                      │
                                                      ▼
                                  +---------------------------------------+
                                  |      SUPABASE / POSTGRESQL CORE       |
                                  | RLS • Constraints • Immutability      |
                                  +---------------------------------------+
                                     │                    │             │
                                     ▼                    ▼             ▼
                           +-------------------+ +-------------+ +-------------+
                           | Double-Entry      | | Transaction | | Outbox      |
                           | Ledger Tables     | | State Engine| | Event Bus   |
                           +-------------------+ +-------------+ +-------------+
```

---

## 2. Non-Negotiable Database Isolation Principles
1. **No Direct Frontend Table Mutation**: Browsers and mobile clients never connect directly to database tables. Every mutation passes through authenticated domain APIs.
2. **Zero Service-Role Key Leakage**: The Supabase `service_role` key exists exclusively in server-side microservices and is never bundled in frontend JavaScript.
3. **Double-Entry Mathematical Balance**: Enforced via PostgreSQL triggers ensuring `SUM(debits) = SUM(credits)` on every committed financial transaction.
4. **Append-Only Immutability**: Historical financial records and audit trails prohibit `UPDATE` and `DELETE` queries at the database trigger layer.
