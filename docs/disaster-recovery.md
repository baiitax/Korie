# KORIEPAY DISASTER RECOVERY & BUSINESS CONTINUITY SPECIFICATION

## 1. RPO & RTO Objectives
- **Recovery Point Objective (RPO)**: $\le 1$ minute for double-entry ledger transactions (Point-In-Time PostgreSQL WAL archiving).
- **Recovery Time Objective (RTO)**: $\le 15$ minutes for automated failover to standby database cluster.

---

## 2. Disaster Recovery Scenarios & Failover Matrix

| Incident Type | Automated Response | Manual Escalation |
|---|---|---|
| **Primary Database Failure** | PostgreSQL streaming replica promoted to Primary | SRE checks connection pools |
| **Providus Bank Node Outage**| Circuit breaker opens, outward transfers parked in PENDING | Finance informs treasury desk |
| **Koris Bank Node Outage** | Bilateral corridor rate locks paused | Operations switches to async queue |
| **Webhook Discard Spike** | Exponential retry backoff automatically engages | Developer alerted via email |
