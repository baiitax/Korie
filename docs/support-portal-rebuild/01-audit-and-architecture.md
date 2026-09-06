# KoriePay Support Portal Rebuild — §03 Repository Audit & Architecture

**Status:** Audit complete. Rebuild in progress.
**Scope:** Full operational rebuild of `/support` per the 120-point spec. The Support Portal becomes a service layer over the existing KoriePay ecosystem — not a cosmetic dashboard.

---

## 1. What exists today (audited 2026-09-05)

### 1.1 Support UI (client-only)
- 17 thin pages under `src/app/support/*` (7–243 lines): dashboard alias, inbox, my-queue, tickets, customers, transactions, knowledge-base, analytics, audit, automation, playbooks, qa, training, capacity, team, incidents, settings.
- `src/components/support/` — `SupportShell` (sidebar + officer switcher + jurisdiction filter), `SupportContext` (client context holding **all mock data**), plus modals (create ticket, escalation, incident, automation rule) and `TicketDetailWorkspace`.
- **No server routes. No API. No state machine. SLA dates are hardcoded strings; there is no SLA engine, no assignment logic, no event log, no idempotency, no RBAC.**

### 1.2 Support data (mocks only)
- `src/services/supportDataService.ts` (918 lines) — `MOCK_*` constants: 7 officers, 5 tickets (with messages), 3 customer-360 contexts, 2 transaction investigations, 3 playbooks, 3 knowledge articles, 1 incident, 3 automation rules, 1 QA review, 3 training modules, capacity metric, health score, 3 audit entries.
- Consumed directly by client components (scattered data source — spec §100 violation).

### 1.3 Types (keep & extend)
- `src/types/support.ts` (349 lines) already defines the spec §06 lifecycle (`NEW → TRIAGED → ASSIGNED → IN_PROGRESS → WAITING_FOR_CUSTOMER → WAITING_FOR_INTERNAL_TEAM → ESCALATED → RESOLVED → CLOSED (+REOPENED)`), priorities `LOW/NORMAL/HIGH/URGENT/CRITICAL`, 20 categories, officers, tickets, messages, customer-360, transaction-investigation, playbooks, KB, incidents, automation, QA, training, audit.
- **Decision:** extend with new operational entities in `src/types/supportOps.ts`; do not fork the existing types.

### 1.4 Localization
- Main system: `src/locales/{en,fr,ha}.ts` + `LanguageContext.t()` + **build-time parity gate** (`scripts/i18n-parity.mjs`, runs on `prebuild`) — every EN key must exist in FR and HA, non-empty.
- Legacy: `src/locales/support/{en,fr,ha}.ts` (65 lines each, shell labels only, NOT parity-gated), imported only by `SupportShell` + `SupportContext`.
- **Decision:** the rebuilt portal migrates to the main i18n system under a `supportOps` namespace so EN/FR/HA completeness is build-enforced (spec §84). Legacy files are removed once the new shell stops importing them.

### 1.5 Design system
- Customer portal uses the scoped `.kp-portal` token block in `src/app/globals.css` (light-first, emerald `#0b7a63` / teal `#158987` / gold `#ebc844` / orange `#f88d25`, navy ink `#20273a`, glass blur levels, rounded radii). Tokens are intentionally scoped so other portals are untouched.
- **Decision:** add a sibling `.kp-support` token block mirroring the same palette (spec §109 — no invented colors/radii), tuned for higher operational density (tighter table padding, denser badges).

### 1.6 Authentication & API infrastructure (reused, not reinvented)
- `authenticateApiRequest(req, scopes)` — Bearer `kp_test_*`/`kp_live_*` validation, scope checks, request/correlation/idempotency ids.
- `createSuccessResponse` / `createErrorResponse` — structured API envelope (`status`, `code`, `data`, `meta`, `error`).
- `AuditService.log(...)` — global immutable audit (already PII-sansitized via `sanitizePayloadForLogging`).
- Client helper pattern: `customerPortalClient.portalFetch` (attaches sandbox Bearer token).
- **Decision:** support routes use the same middleware; officer identity is asserted via `x-kp-support-officer` header and **validated server-side against the officer roster**; every permission is enforced server-side by role (spec §53/§54 — the frontend is never trusted). Sandbox officer switcher is a QA aid, clearly labelled.

### 1.7 Authoritative systems the support layer integrates with (spec §02/§04)
| System | Source of truth | Support usage |
|---|---|---|
| Customer master | `CustomerLifecycleEngine` (3 seeded customers: Ibrahim Bello NG, Amara Diallo NE, Jumia merchant NG) | Customer 360 (identity, KYC tier, status, risk) |
| Wallets / accounts | `AccountLifecycleEngine` (subledger-synced, `getAccounts(customerId)`) | 360 accounts — **XOF first, NGN second, no USD** |
| Transactions | `TransactionService` (module-level store; `executeCrossBorderTransfer`, `listRawForOwner`; provider adapters Providus/Koris via `ProviderService`) | Transaction investigation: authoritative status, provider ref, fee, ledger linkage |
| Service health | `HealthCheckEngine.getDeepHealth()` (ledger balance, provider circuit breakers, identity, treasury, safe mode) | Live service health module — **real values, never fabricated** (spec §15) |
| Disputes / chargebacks | `DisputeChargebackEngine` (`createDispute`, `resolveDispute`) | Authorized refund/reversal requests create recovery cases here — **never a balance UPDATE** (spec §31) |
| Complaints | `ComplaintDisputeEngine` (`/api/complaints`) | Cross-reference in customer 360 |
| Ledger | `DoubleEntryLedgerEngine` / `SubledgerEngine` | Ledger status in transaction trace |

**Hard rule (spec §04):** Support can inspect, explain, communicate, classify, escalate, and initiate *approved* workflows. It never mutates balances, transaction status, KYC, AML, or provider settlement state. The only financial side-effect Support may cause is creating a **recovery/dispute case** in `DisputeChargebackEngine` with `financialAction: REQUESTED`, which is then executed (or rejected) by the authoritative recovery process.

---

## 2. New architecture

```
src/lib/support/                    ← server-side support domain (new)
├── SupportOpsStore.ts              singleton store: tickets, messages, events,
│                                   disputes, escalations, tasks, knowledge,
│                                   macros, csat, notifications, officers,
│                                   audit. Seeded from supportSeed.ts.
├── supportSeed.ts                  the ONLY demo data source (spec §100)
├── SupportOpsEngine.ts             lifecycle state machine (validated
│                                   transitions), SLA engine (backend
│                                   timestamps, pause/resume), assignment
│                                   engine (least-loaded + language +
│                                   skill + jurisdiction), duplicate
│                                   detection, event log, idempotency
├── SupportPermissions.ts           RBAC matrix (role → capability)
└── SupportContexts.ts              customer-360 resolver + transaction
                                    investigation resolver (integrates the
                                    authoritative engines, XOF-first,
                                    PII-masked)

src/app/api/support/*               ← API surface (new, ~20 routes)
  overview, tickets, tickets/[id], tickets/[id]/messages,
  tickets/[id]/transition, customers, customers/[id],
  transactions, transactions/[id], disputes, disputes/[id],
  refunds, escalations, escalations/[id], tasks,
  knowledge, knowledge/[id], macros, analytics, analytics/agents,
  audit, notifications, health, search, create-ticket (idempotent)

src/services/supportOpsClient.ts    ← typed client (new)

src/components/support/*            ← rebuilt component system (spec §108)
src/app/support/*                   ← pages per spec §107 page map

src/locales/{en,fr,ha}.ts           ← `supportOps` namespace (parity-gated)
src/app/globals.css                 ← `.kp-support` token block
```

## 3. SLA engine (spec §08)

Policy (backend timestamps, no fake timers):

| Priority | First response | Resolution |
|---|---|---|
| CRITICAL | 15 min | 4 h |
| URGENT | 30 min | 8 h |
| HIGH | 1 h | 24 h |
| NORMAL | 4 h | 72 h |
| LOW | 8 h | 96 h |

- `firstResponseDueAt` / `resolutionDueAt` computed **at creation** from `createdAt` + policy, stored on the ticket (matches existing schema).
- Resolution clock **pauses** while status is `WAITING_FOR_CUSTOMER` (cumulative paused ms tracked per ticket) and resumes on customer reply.
- State machine: `ON_TRACK → AT_RISK (≤25% remaining) → BREACHED`; `PAUSED` while waiting for customer; `MET` / `BREACHED_LATE` once resolved. Composite ticket state = worst component.
- All SLA computation lives in `SupportOpsEngine` and re-derives from timestamps on every read — nothing is cached or hardcoded.

## 4. Lifecycle & permissions (spec §06/§07/§53)

State machine transitions are validated by `SupportOpsEngine.transition(ticketId, to, actor)`; illegal transitions return 409 with the allowed targets. Every transition appends an immutable `SupportEvent` (§51) and sensitive ones a `SupportAuditEntry` (§52) + `AuditService` record.

RBAC roles (existing `SupportRole`, extended with `SUPPORT_READ_ONLY`): TIER_1_JUNIOR, TIER_2_SENIOR, TIER_3_FINANCE / TIER_3_FRAUD / TIER_3_COMPLIANCE / TIER_3_TECH_OPS, SUPPORT_SUPERVISOR, SUPPORT_MANAGER, SUPER_ADMIN, SUPPORT_READ_ONLY. Capability matrix in `SupportPermissions.ts` (e.g. only TIER_3/SPECIALIST+ can record a dispute financial decision; only supervisor+ can close; unmasking PII requires TIER_2+; provider traces require TIER_2+).

## 5. Security posture (spec §91/§92)

- All routes: auth → officer validated against roster → role capability check → ownership/IDOR rule (a customer/transaction is only reachable through a ticket the officer may access, or via authorized search that still applies the same capability gates).
- PII masking by default (`+234 ••• ••• 4821`, `•••• 4821`); unmasking requires the capability AND writes an audit event.
- No secrets/keys in responses (provider traces expose references only).
- Ticket/message creation is idempotent (`idempotencyKey` header or body).
- Error responses are operational messages; technical detail stays server-side (spec §73).

## 6. Delivery phases

| Phase | Deliverable |
|---|---|
| A (this pass) | Audit doc, types, RBAC matrix, store + centralized seed |
| B | Engine (lifecycle/SLA/assignment/dedup/events), context resolvers, auth middleware scope extension |
| C | API routes (~20) |
| D | Client service + `supportOps` i18n namespace (EN/FR/HA, parity-gated) |
| E | Component system, shell (sidebar §09 / header / mobile nav / dark mode), all pages (§107) |
| F | tsc + lint + parity gate + `next build`, multi-width/theme/language QA, commit & push |
