# KORIEPAY API COMMUNICATION FABRIC & GATEWAY ARCHITECTURE

## 1. Unified Communication Topology
All KoriePay portals and external partners communicate through a centralized API gateway:

```
                            CLIENT REQUEST
                                  │
                                  ▼
                     +──────────────────────────+
                     |    API GATEWAY ROUTER    |
                     +──────────────────────────+
                                  │
                   +──────────────┴──────────────+
                   ▼                             ▼
             PUBLIC API                    INTERNAL API
             (/api/v1/*)                  (/api/v1/internal/*)
                   │                             │
                   └──────────────┬──────────────┘
                                  │
                                  ▼
                     +──────────────────────────+
                     |     AUTH & IAM LAYER     |
                     |  Bearer Token • Scopes   |
                     +──────────────────────────+
                                  │
                                  ▼
                     +──────────────────────────+
                     |   IDEMPOTENCY & LIMITS   |
                     | Distributed Redis Locks  |
                     +──────────────────────────+
                                  │
                                  ▼
                     +──────────────────────────+
                     |  DOMAIN SERVICE EXECUTION|
                     | Transaction • Ledger Svc |
                     +──────────────────────────+
                                  │
                                  ▼
                     +──────────────────────────+
                     |   SUPABASE POSTGRESQL    |
                     +──────────────────────────+
```

---

## 2. API Contract Layering
- **Public REST API**: `/api/v1/*` (External merchants, agency apps, mobile clients).
- **Internal Microservice Fabric**: `/api/v1/internal/*` (Reconciliation, health, outbox workers).
- **Provider Webhook Ingest**: `/api/v1/webhooks/*` (Providus, Koris Bank, NIBSS).
