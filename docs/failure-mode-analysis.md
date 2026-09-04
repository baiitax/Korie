# Failure Mode & Effects Analysis (FMEA)

## 1. Comprehensive System Failure Modes

| Component | Failure Scenario | Impact | Autonomous Containment | Recovery Procedure |
|---|---|---|---|---|
| **PostgreSQL Database** | Primary node crash / Connection pool exhaustion | Unable to post transactions | Read-only replicas serve queries; write traffic returns 503 | Automated replica promotion, connection pool restart, replay outbox |
| **NIBSS / NIP Switch** | National payment switch timeout / downtime | Outward transfers hanging | Circuit breaker trips to OPEN; transaction marked `PENDING_CONFIRMATION` (No duplicate retries) | Background daemon queries NIP transaction status; reconciliation engine catches discrepancy |
| **KYC Identity Registry** | NIMC / NINA government portal offline | New customer verification stuck | KYC application held in `UNDER_REVIEW`; fallback to secondary biometric liveness | Secondary provider verify or manual review queue routing |
| **Background Queue** | Worker process crash mid-transaction | Unprocessed outbox event | Transaction durable in database; worker restarts and re-claims via lock timeout | Dead-letter queue captures poisoned jobs; idempotent replay trigger |
| **Treasury Liquidity** | Providus Bank settlement sub-account depleted | Merchant payout failure | Settlement batch held in `PROCESSING`; automated `LOW_LIQUIDITY` alert | Maker-Checker treasury funding transfer from main vault 1010 |
