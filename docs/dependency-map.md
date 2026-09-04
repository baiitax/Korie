# Live Dependency Inventory & Criticality Hierarchy

## 1. Service Criticality Classification

```
  Tier 0: Financial Truth & Ledger (Zero Tolerance for Corruption)
     │
     ├── PostgreSQL Database / Supabase Instance
     ├── DoubleEntryLedgerEngine & journal_entries Table
     └── Idempotency Registry & unique constraints
     │
  Tier 1: Financial Movement & Verification
     │
     ├── Providus Bank Nigeria Gateway Node (058)
     ├── Koris Bank Niger Republic Gateway Node (SA)
     ├── Settlement Engine & settlement_batches Table
     └── Reconciliation Engine & MT940 Parser
     │
  Tier 2: Identity, Security & Compliance
     │
     ├── Master Identity Platform (KID-XXXXXXXX)
     ├── NIMC / BVN / NINA / CAC Verification Adapters
     ├── Fraud & Risk Decision Engine (14-step pipeline)
     └── Supabase Authentication & IAM Roles
     │
  Tier 3: Operations & Communication
     │
     ├── Support Ticket Desk & Work Queues
     ├── SMS / Email Webhook Gateways (Twilio / SendGrid)
     └── Analytics & Financial Reporting Engines
     │
  Tier 4: Non-Essential Content
     │
     └── Marketing Pages, Static FAQs, Public Documentation
```

---

## 2. Hard Failure Decoupling Rules
- A failure in **Tier 3 (SMS Gateway)** must never block **Tier 0 (Ledger Commit)**.
- A failure in **Tier 2 (NIMC Identity Portal)** must never compromise existing **Tier 1 (Customer Transfers)** for already verified accounts.
- A failure in **Tier 1 (Provider Payout)** must mark the transaction `PENDING` rather than corrupting the **Tier 0 (Double-Entry Balance)**.
