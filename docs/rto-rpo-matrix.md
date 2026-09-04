# Recovery Time Objective (RTO) & Recovery Point Objective (RPO) Matrix

## 1. System Recovery Objectives

| Service Tier | Systems Included | Target RTO (Max Downtime) | Target RPO (Max Data Loss) | Backup & Redundancy Strategy |
|---|---|---|---|---|
| **Tier 0** | Core Double-Entry Ledger, Financial DB, Idempotency Store | **< 15 Minutes** | **0 Minutes (Zero Loss)** | Synchronous multi-AZ replication, continuous WAL streaming, PITR |
| **Tier 1** | Settlement Batches, Provider Adapters, Inward/Outward Clearing | **< 30 Minutes** | **< 5 Minutes** | Outbox durable store, provider reconciliation catch-up daemons |
| **Tier 2** | Master Identity Platform, KYC Verification, Fraud/Risk Engine | **< 45 Minutes** | **< 15 Minutes** | Encrypted document backups, SHA-256 evidence vaulting, cached profile read-paths |
| **Tier 3** | Customer Support Desk, Notification Daemons, Financial Reports | **< 2 Hours** | **< 1 Hour** | Asynchronous event queues, materialized view rebuilds |
| **Tier 4** | Marketing Portal, Public Developer Docs, Static FAQ Pages | **< 4 Hours** | **< 24 Hours** | CDN edge caching, static site generation (SSG) |

---

## 2. Invariant Compliance Assertion
- Under no catastrophic circumstance may **Tier 0 RPO** exceed 0 minutes for committed double-entry ledger transactions.
- If data divergence is detected between primary database and banking statements, the **Reconciliation & Suspense Engine** isolates unverified movements into Account `7200` until reconciled.
