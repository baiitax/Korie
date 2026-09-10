# 07 — GAP-3 & GAP-4 remediation: the support desk, working the real book

Status: **IMPLEMENTED + GATES GREEN + LIVE-VERIFIED** (prod build on :3000) · Date: 2026-09-10 · Branch: `feature/compliance-portal-demo-rebuild`

## What was asked (verbatim)

> **GAP-3 · The support console was fiction while the desk is the CX frontline — HIGH**
> `/admin/support` rendered **two hard-coded tickets** (`TCK-8812`, `TCK-8813`) that exist nowhere in any engine; the
> SLA copy was invented. Meanwhile `ComplaintDisputeEngine` (rich lifecycle, SLA, assignment) was only reachable
> through agent-scoped routes, and its compensation capability (double-entry consumer redress) had **no admin API at
> all**. Result: a regulator-grade complaint book invisible to ops, and the only redress mechanism uncallable.
>
> **GAP-4 · Fragmented book of work — MEDIUM**
> Complaints (nowhere in admin), disputes (disputes page), chargebacks and refunds (engine APIs unused by any admin
> page) lived in four disconnected places with no synthesis: no P0 count, no SLA-breach count, no unresolved-exposure
> value visible on the home screen for the accountable executive.

## Audit first: what was already closed, and what was still open

Rather than re-fix what earlier passes had done, each claim was checked against the tree:

| Claim | Status at audit | Evidence |
| --- | --- | --- |
| `/admin/support` shows `TCK-8812` / `TCK-8813` | **Already closed** | `grep -rn "TCK-8812\|TCK-8813" src/` → 0 hits. The admin desk was rebuilt onto `ComplaintDisputeEngine` in an earlier pass. |
| Invented SLA copy on the admin desk | **Already closed** (GAP-2) | The tile now prints the engine's real ladder: *P0 24h · P1 48h · P2 72h · P3 120h*, computed from each case's `slaDueAt`. |
| Compensation has no admin API | **Already closed** | `POST /api/complaints/[id]` `{action:'COMPENSATE'}` → `executeFinancialCompensation` (5010 DR → wallet CR). |
| Engine reachable only via agent-scoped routes | **Partly closed** | `/api/complaints`, `/api/disputes`, `/api/chargebacks`, `/api/refunds`, `/api/disputes/[id]/decision`, `/api/refunds` POST all exist. |
| Chargebacks/refunds unused by any admin page | **Already closed** | `/admin/disputes` reads `/api/disputes`, `/api/chargebacks`, `/api/refunds`. |
| **The support console is fiction** | **STILL OPEN — this pass** | `SupportContext` minted `KP-SUP-<n>` in the browser and held a five-ticket book (`MOCK_SUPPORT_TICKETS`), with invented clocks (`firstResponseDueAt: +30m`, `resolutionDueAt: +4h`, `slaStatus: 'HEALTHY'`) and mock customer-360 / transaction-investigation maps. |

The real GAP-3 was the **support portal** (19 pages, the frontline desk), not the admin desk. That is what this pass
fixed; everything else was verified as already true and is recorded above so it is not re-litigated.

## The desk now works the engine's book

**`src/lib/support/complaintTicketAdapter.ts`** is the single place the two models meet, and it is lossy in only one
direction. A complaint knows things the desk's ticket model has no vocabulary for; the ticket model wants things the
engine never records, and those are named in `UNRECORDED_TICKET_FIELDS` and rendered *"not recorded by the engine"* —
never defaulted to something plausible.

| Desk vocabulary | Engine truth |
| --- | --- |
| `NEW / TRIAGED / ASSIGNED / IN_PROGRESS / WAITING_FOR_CUSTOMER / WAITING_FOR_INTERNAL_TEAM / RESOLVED / CLOSED` | `OPENED / ACKNOWLEDGED·CLASSIFIED / ASSIGNED / INVESTIGATING / PENDING_CUSTOMER / PENDING_PROVIDER / RESOLVED / CLOSED` — two complaint states collapse into `TRIAGED`; the reverse map is written separately rather than inverted |
| `CRITICAL / URGENT / HIGH / NORMAL / LOW` | `P0 / P1 / P2 / P3` (the ladder that owns the SLA clock) |
| `slaStatus: HEALTHY / APPROACHING_BREACH / BREACHED / RESOLVED_ON_TIME` | **Derived at read time** from the case's own `slaDueAt` (±4h window) — a stored SLA state is what GAP-2 found to be false |
| `satisfactionRating` | The customer's real `csatScore` from the capture path (GAP-2) — the desk now sees the customer's own verdict |
| ticket number | `complaintReference` — the engine's own reference, never minted in the browser |

**`SupportContext`** now loads the book from `GET /api/complaints` (30s poll), starts **empty**, and every action is an
engine call: intake → `POST /api/complaints`; triage/assign/escalate/resolve/close/reopen → `PATCH /api/complaints/[id]`;
notes → `POST /api/complaints/[id]/notes`. If the engine refuses, the console shows the refusal (`ticketActionError`)
and re-reads — there is no shadow state to drift.

## What had to be added to the engine to make the desk honest

1. **Case notes did not exist.** The desk's reply/note actions wrote into a React array that vanished on reload. The
   engine now stores append-only, attributed `caseNotes` (`internal` flag preserved) via `addCaseNote`.
2. **No single-case read in admin.** The book was only listable. `GET /api/complaints/[id]` now returns the record,
   status history, notes, computed SLA state, the **redress journal read back from the ledger**, and the customer's
   satisfaction rating.
3. **No intake-channel column** — yet the console filtered on channel. `intakeChannel` is now recorded by whichever
   route took the case in (`ADMIN`, `PORTAL`), so the filter reflects intake rather than invention.
4. **Escalation had no engine state.** There is no `ESCALATED` complaint status, so escalation moves the case to
   `PENDING_PROVIDER` and stores the operator's rationale in the case history, where the admin and CX consoles read it
   back. The status filter no longer offers states no record can reach (it previously offered `ESCALATED`).
5. **Honest empty states.** A book with nothing in it now looks like one: loading, error-with-retry, "no case matches
   these filters", and "the complaint book is empty" — instead of a five-row fixture.

**Simulation layer, labelled.** `officers`, `incidents`, `automation`, `QA / training / capacity` and the
customer-360 / transaction-investigation panels are still fixtures — no engine backs them. Every ticket surface renders
a strip stating exactly that (with the reasons on hover) next to the engine sync line, so an operator can never mistake
one for the other. Customer-360 and investigation panels show "not recorded" rather than a profile assembled from
nothing; `SupportTicket`'s `sentiment`, `tierAssigned`, `language` and `firstResponseDueAt` were made optional to make
that impossible to fake by accident.

## GAP-4: one synthesis for the executive home

`ExperienceHealthPulse` used to fan out to four endpoints (`/api/complaints`, `/api/disputes`, `/api/chargebacks`,
`/api/refunds`) and synthesise nothing. It now reads the single snapshot (`GET /api/admin/cx/overview`) that the CX
console reads, so the home screen and `/admin/cx` cannot disagree. The snapshot gained the two figures GAP-4 names:

- `loop.p0Open` — open cases at the top of the ladder;
- `loop.openExposure` — **every** open case's disputed value by currency (not the top-25 queue, which would have
  under-reported a large book).

The strip now shows: open cases (with resolved), **P0 critical**, **past SLA** (with closing-in and open count),
disputes · chargebacks · refunds, **unresolved exposure by currency**, plus CSAT (or "not measurable") and prevention
(recurring patterns / active incidents). Mixed currencies are never summed into one number.

## Verification (live, prod build)

```
1. book as the support console reads it — GET /api/complaints
   total 2 | open 2 | resolved 0 | p0 1
   CMP-2026-00918 INVESTIGATING P0 | assigned support.lead@koriepay.ng

2. intake from the desk (no browser-minted number)
   CMP-2026-71956 | id cmp-460976 | OPENED | clock 2026-09-13T01:57 | intakeChannel ADMIN

3. note from the desk (previously vanished on reload)
   note-1789005461048-893 | notes on case 1
   note with no author → 400 AUTHOR_EMAIL_REQUIRED

4. single-case record — GET /api/complaints/[id]
   history [('OPENED', None)] | notes [('officer.ade@koriepay.ng', internal=True, …)]
   sla {dueAt 2026-09-13T01:57, policyHours 72, breachedAtRead False, storedFlag False}
   intakeChannel ADMIN | satisfaction not rated | unknown id → 404

5b. redress read back from the ledger
   journal JRN-20260910-6209 | CMP-2026-21633 → RESOLVED
   redressJournal {journalNumber JRN-20260910-6209, NGN 2500, postedBy support.lead@koriepay.ng}

6. GAP-4 synthesis — GET /api/admin/cx/overview
   loop  {captured 4, open 3, p0Open 1, openExposure [{NGN 47000},{XOF 1500}], resolved 1, resolvedWithRedress 1}
   sla   {breached 0, atRisk 0, onTrack 3}
   book  disputes 1 | chargebacks 1 | refunds 1 | GL 5010 postings 1

7. surfaces — /support, /support/tickets, /support/inbox, /support/my-queue, /support/analytics, /admin, /admin/cx,
   /admin/support, /admin/disputes, /compliance, /merchant → all 200

8. bundles — "read from ComplaintDisputeEngine" present; "KP-SUP-" minting absent from shipped client bundles
```

Gates: `npx tsc --noEmit` 0 · `npx next lint` **0 errors** in touched files · `npx next build` ✓
(`/api/complaints/[id]` and `/api/complaints/[id]/notes` present as dynamic routes).

## Still flagged for phased replacement

- **Support-console fixtures**: officer roster, desk incident log, automation rules, QA/training/capacity, customer-360
  and transaction investigation. Labelled in-product; the desk's own book, intake, triage, notes and redress are real.
- **`services/supportDataService.ts`** (918 lines) is still the fixture source for those panels; it is no longer the
  source of the ticket book.
- **`adminDataService.ts`** (GAP-1's remaining static layer) still feeds `/admin/{bdc,merchants,transactions,transfers,wallets}`.
- **`/admin/disputes`** reads the engine APIs directly and shows engine truth; the cross-engine synthesis lives at
  `/api/admin/cx/overview`, which the executive pulse and `/admin/cx` share.
