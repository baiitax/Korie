# KoriePay Enterprise Adashi / Ajo / ROSCA & Central Liquidity Pool Architecture

## 1. Executive Summary & Authoritative Financial Hierarchy

The **KoriePay Adashi / Ajo / Rotating Savings (ROSCA) Engine** operates as an orchestration and product layer designed to digitize rotating community savings collectives across **Nigeria (NGN)** and **Niger Republic (XOF)**. 

### 1.1 Non-Negotiable Core Principle
> **Adashi is an orchestration layer, NOT the financial source of truth.**
> The existing **KoriePay Core Ledger** remains strictly authoritative for all actual debits, credits, platform fee revenue, agent commissions, customer wallet liabilities, and bank settlement accounting.
> The **Central Liquidity Pool** is a treasury and liquidity-position layer that represents available, reserved, restricted, pending, and projected liquidity across KoriePay’s banking relationships. It does not silently create or destroy money.

```
FINANCIAL AUTHORITY HIERARCHY:
Identity & Tenancy
       │
       ▼
KYC / KYB Tier Verification
       │
       ▼
Customer Wallet & Account Authorization
       │
       ▼
Risk, Fraud & AML Decision Engine
       │
       ▼
Payment Switch (NIP / WAEMU RTGS)
       │
       ▼
CORE DOUBLE-ENTRY LEDGER (Authoritative Balance Sheet)
       │
       ▼
Settlement & Custodial Bank Clearing (Providus NG / Koris NE)
       │
       ▼
3-Way Zero-Variance Reconciliation Engine
       │
       ▼
Adashi Orchestration & Central Liquidity Pool Position
```

---

## 2. Central Liquidity Pool Topology & Hierarchy

To guarantee zero cross-border contagion, KoriePay enforces strict jurisdictional and currency isolation:

```
                          KORIEPAY GROUP
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
Nigeria Legal Entity (KP-NG)              Niger Legal Entity (KP-NE)
Country: NG | Currency: NGN               Country: NE | Currency: XOF
        │                                               │
  ┌─────┴────────────────────────┐                ┌─────┴────────────────────────┐
  ▼                              ▼                ▼                              ▼
NGN Central Pool          NGN Adashi Reserve    XOF Central Pool          XOF Adashi Reserve
(KP-NG-LIQUIDITY)         (KP-NG-ADASHI-RES)    (KP-NE-LIQUIDITY)         (KP-NE-ADASHI-RES)
  │                              │                │                              │
  ├── Providus Bank NG           └── Pool Holds   ├── Coris Bank NE              └── Pool Holds
  ├── Commercial Accounts                         ├── Commercial Accounts
  └── Settlement Accounts                         └── Settlement Accounts
```

### 2.1 Absolute Currency Rule
* **Never combine NGN and XOF in any single calculation.**
* Financial positions must use `NUMERIC(24,2)`. Floats or doubles are strictly prohibited.
* Cross-border conversions must occur exclusively through explicit, authorized `liquidity.fx_transactions` with recorded quote IDs and accounting journal entries.

---

## 3. Database Schema Map

### Domain A: `adashi` Schema
| Table | Description |
|---|---|
| `adashi.products` | Configurable product catalog templates (cadence, quorum, fee caps, grace periods). |
| `adashi.product_versions` | Immutable snapshots of historical product catalog rules. |
| `adashi.groups` | Master table for Adashi circles with lifecycle states and custodial vault accounts. |
| `adashi.group_versions` | State snapshots for full historical reproducibility. |
| `adashi.group_events` | Immutable chronological log of group state transitions. |
| `adashi.members` | Enrolled savers, assigned payout positions, KYC tiers, and debit mandate statuses. |
| `adashi.member_events` | Member lifecycle events (join, consent, lock, exit, default). |
| `adashi.invitations` | Member invitation tokens, WhatsApp/SMS distribution, and delivery status. |
| `adashi.consents` | Electronic mandate authorizations, terms versioning, and IP/device fingerprints. |
| `adashi.allocations` | Master record for cryptographically verifiable rotation turns (`HMAC-SHA256`). |
| `adashi.allocation_versions` | Historical rotation versions created during approved member exit/swap workflows. |
| `adashi.allocation_members` | One-to-one mapping between locked members and sequential cycle slots. |
| `adashi.rotation_change_requests` | Maker-Checker proposals for manual rotation overrides. |
| `adashi.rotation_change_approvals` | Checker sign-offs for rotation change governance. |
| `adashi.cycles` | Cycle state machine, pool totals, beneficiary assignments, and net payout amounts. |
| `adashi.cycle_events` | Immutable log of cycle status transitions. |
| `adashi.contribution_obligations` | Individual member obligations per cycle with retry counts and status. |
| `adashi.contribution_attempts` | Auto-debit payment switch invocations with durable idempotency keys. |
| `adashi.contribution_events` | Audit trail of contribution settlements and failures. |
| `adashi.payouts` | Disbursed cycle funds, fee distributions, and maker-checker dual controls. |
| `adashi.payout_attempts` | Payout dispatch logs with transaction switch correlation IDs. |
| `adashi.payout_events` | Payout authorization and settlement event stream. |
| `adashi.defaults` | Default recovery cases, waterfall stages, and agent liability tracking. |
| `adashi.default_events` | Recovery stage changes and partial amount offset logs. |
| `adashi.member_exits` | Member replacement records and financial settlements. |
| `adashi.exceptions` | Incident queue for provider timeouts, unknown statuses, and liquidity holds. |
| `adashi.exception_events` | Incident resolution audits. |
| `adashi.disputes` | Customer dispute cases with arbitration notes. |
| `adashi.fees` | Platform commissions and agent revenue records. |
| `adashi.risk_events` | AML anomaly signals and syndicate cluster alerts. |
| `adashi.notifications` | Customer communication logs across SMS, WhatsApp, Push, and Email. |
| `adashi.scheduler_executions` | Automated cron execution metrics. |
| `adashi.idempotency_keys` | Central idempotency store preventing duplicate debits and payouts. |
| `adashi.audit_logs` | Append-only immutable compliance log. |

### Domain B: `liquidity` Schema
| Table | Description |
|---|---|
| `liquidity.legal_entities` | Corporate entities (`KP-NG`, `KP-NE`). |
| `liquidity.banking_providers` | Configurable banking nodes (`PROVIDUS_NG`, `KORIS_NE`). |
| `liquidity.pools` | Multi-tier treasury liquidity pools. |
| `liquidity.pool_accounts` | Bank accounts linked to pools. |
| `liquidity.positions` | Multi-dimensional positions (Confirmed, Available, Reserved, Restricted, In-Transit). |
| `liquidity.movements` | Treasury rebalancing, settlements, and manual adjustments. |
| `liquidity.movement_events` | Movement audit trails. |
| `liquidity.reservations` | Pre-payout liquidity holds guaranteeing cycle disbursement solvency. |
| `liquidity.reservation_events` | Reservation lifecycle events (Created, Consumed, Released). |
| `liquidity.alerts` | Treasury alert triggers for concentration, low float, and payout exposure. |
| `liquidity.position_snapshots` | Daily and event-triggered balance snapshots. |
| `liquidity.fx_transactions` | Bilateral NGN/XOF conversions with quote verification. |
| `liquidity.audit_logs` | Immutable treasury activity ledger. |

---

## 4. End-to-End Operational Lifecycle

### 4.1 Adashi Circle Lifecycle
```
[DRAFT]
   │
   ▼
[OPEN_FOR_MEMBERS] ──▶ (Agent invites savers; mandates collected)
   │
   ▼
[MEMBERSHIP_LOCKED] ─▶ (adashi.lock_membership(): Quorum & KYC validated)
   │
   ▼
[ALLOCATION_PUBLISHED] ─▶ (adashi.generate_adashi_allocation(): HMAC-SHA256)
   │
   ▼
[ACTIVE] ────────────▶ (adashi.create_adashi_cycles(): Cycles & obligations created)
   │
   ▼
[CYCLE_IN_PROGRESS] ─▶ (Auto-debit contributions collected via Switch)
   │
   ▼
[PAYOUT_PROCESSING] ─▶ (Maker-Checker approval & Core Ledger disbursement)
   │
   ▼
[COMPLETED] ─────────▶ (All cycles closed with zero variance)
```

### 4.2 Liquidity Reservation Lifecycle
```
Adashi Cycle Scheduled
         │
         ▼
[REQUESTED] ────▶ liquidity.create_liquidity_reservation()
         │        • Validates available liquidity in matching currency pool
         │        • Updates pool position: reserved += amount, available -= amount
         ▼
[ACTIVE] ───────▶ Held in reserve during collection window
         │
         ├─────────────────────────────────────────┐
         ▼ (Cycle payout dispatched)               ▼ (Cycle cancelled / defaulted)
[CONSUMED]                                 [RELEASED]
liquidity.consume_liquidity_reservation()  liquidity.release_liquidity_reservation()
• Pool reserved position decremented       • Pool reserved restored to available
• Core Ledger books disbursement           • Zero financial loss
```

---

## 5. Security Model & Row-Level Security (RLS)

1. **Service Role Access**: Backend API workers and background schedulers execute via Supabase `service_role` bypassing RLS through secure, transactional server actions.
2. **Authenticated Customers**: Restricted to viewing only their own memberships, active circle progress, personal contribution obligations, and payouts.
3. **Authenticated Agents**: Restricted to viewing only Adashi circles they created or were explicitly assigned to administer.
4. **Super Admin & Treasury**: Full operational visibility with dual-authorization enforcement for high-value payouts ($\ge 500\text{k}$) and manual rotation sequence overrides.
5. **Data Protection**: Real PII and credentials are never stored in plaintext. Synthetic test data is tagged with `is_test_data = true`.

---

## 6. Testing & Validation Runbook

To execute the test suite in a Supabase / PostgreSQL database:

```bash
# 1. Apply Migration
psql -h <SUPABASE_HOST> -U postgres -d postgres -f supabase/migrations/20260904000027_adashi_and_central_liquidity_pool.sql

# 2. Apply Synthetic Seed Data
psql -h <SUPABASE_HOST> -U postgres -d postgres -f supabase/seed/adashi_liquidity_test_data.sql

# 3. Execute Automated Validation Test Suite
psql -h <SUPABASE_HOST> -U postgres -d postgres -f supabase/tests/adashi_liquidity_validation.sql
```

The validation script runs all 16 automated scenarios and asserts:
* Quorum locking and deterministic cryptographic allocations.
* Exact 1-to-1 member slot uniqueness.
* Zero-variance pool obligation reconciliation.
* Available vs Reserved liquidity math.
* Rejection of duplicate payouts and duplicate contributions via database constraints.
* Strict rejection of cross-border currency mismatches (attempting NGN reservations on XOF pools).
