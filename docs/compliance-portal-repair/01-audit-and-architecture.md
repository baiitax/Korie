# Compliance portal — audit, architecture, and per-page data contract

Work performed on 2026-09-05 in `https://github.com/baiitax/Korie` (branch `main`).
Scope: the Compliance & Financial Crime console (`/compliance/**`). The customer
portal rebuild is documented separately in `docs/customer-portal-repair/`.

Nothing in the business model, the engines, the API surface or the navigation
philosophy was changed. This is a reshape of the existing portal: the same
sidebar sections, the same queues, the same actors — now served by real reads.

---

## 1. What the rebuild had to solve

The pre-rebuild console had three structural problems, not cosmetic ones:

1. **One mock store, no seam.** Every screen read `complianceDataService` through
   `ComplianceContext`, so "live" and "sample" data were indistinguishable and a
   real endpoint could not be swapped in without touching every page.
2. **The sidebar promised more than it had.** Several rail entries led to
   placeholder panels; a row click, a notification, a "view all" link would land
   on a screen with no action behind it.
3. **Criticality was painted, not modelled.** Colour carried the meaning; counts
   carried nothing; and there was no statement anywhere of where a number came
   from — which in an AML console is the whole audit question.

## 2. The seam: one place knows whether a screen is live

```
src/services/compliance/
  endpoints.ts     LIVE_SOURCES / LIVE_DETAIL_PATHS / LIVE_ACTIONS / WIRING   ← the only file that knows
  normalizers.ts   mapAlert … mapRestatement  (wire shape → view row)
  service.ts       loadComplianceResource(key, opts)  · 2.5 s read cache · clear-on-write
  derive.ts        deriveDashboard / deriveTasks / deriveNotifications (from live rows)
  hooks.ts         useComplianceResource · useComplianceAction · useAutoClearingFeedback
  mutations.ts     the only writes the portal can make
  demo/            fixtures · store · toRows          ← demo lives here and nowhere else
  session.ts       /api/security/me → actor view (never fabricated)
  jurisdiction.ts  the ALL / NG / NE scope, shared by rail, badges and every page
```

`WIRING` classifies each resource as `live`, `derived` or `demo`, and a page asks
for a **key**, never a URL. That single decision is what keeps §70/§71 true: when
a backend contract lands for, say, watchlists, one entry in `endpoints.ts` turns
the demo screen into a live one and no page is edited.

Every resource read returns the same envelope, so every state is addressable:

```ts
{ status: 'ready' | 'empty' | 'error' | 'unauthorized' | 'unavailable',
  data, total, source: 'live' | 'demo', demoFallback, derived, latencyMs, requestId, error? }
```

## 3. §84 contract, per screen

`L` = full-page/section loading · `S` = success feedback · `E` = empty ·
`X` = error · `A` = unauthorised. "Endpoint" is the real route the row comes from.

| Screen | Data source | Endpoint / call | Request | Response | L | S | E | X | A |
|---|---|---|---|---|---|---|---|---|---|
| `/compliance` dashboard | AML engines, master identity, health, obligations | `alerts`, `cases`, `customers`, `calendar`, `systemHealth`, `integrations` (parallel) | GET, jurisdiction-scoped | 8 KPIs + queues + rails, all counted | skeleton | refresh inline | per-panel empty text | per-panel retry, no zeros | health/AML panels fall back to `unavailable` |
| Shell chrome (search, bell, profile, rail counts) | same resources, shared cache | `dashboard` + `alerts` + `cases` + `notifications` derived | GET | counts, `⌘K` results, actor card | spinner on bell | mark-read is local, labelled | "nothing unread" | search says unavailable | session view shows why it is unavailable |
| `/compliance/alerts` | `AmlAlertEngine` | `GET /api/aml/alerts?severity&status` | GET (+server filters) | `AlertRow[]` | table skeleton | disposition reloads queue | "queue clear for this jurisdiction" | `X-Request-Id` + retry | 401 → sign-in-scoped message |
| `/compliance/alerts/[id]` | one alert record | `GET /api/aml/alerts/:id` → `{alert}` | GET | what/why/who/how + SLA | detail skeleton | disposition + reload | 404 → "not in the queue", never a blank | error card + retry | n/a (same scope as list) |
| disposition (alert) | engine write | `POST /api/aml/alerts/:id {action:'UPDATE_STATUS'}` | status (+assignee) | `{success, alert}` | button-pending | server echo of new status | — | engine error string surfaced | refused before the call if scope missing |
| alert → case | engine write | `POST /api/aml/alerts/:id {action:'CONVERT_TO_CASE'}` | investigator email | new `AmlCaseRecord` | button-pending | links to the case | — | error inline in modal | — |
| `/compliance/tasks` | derived only | none — `deriveTasks()` from `alerts`, `cases`, `calendar`, `approvals` | — | `TaskRow[]` grouped | skeleton | n/a (read-only) | "nothing is waiting on you" | inherits source errors | — |
| `/compliance/customers` | master identity + queue join | `GET /api/core/v1/identity/persons` (+ alerts, cases) | GET | `CustomerRow[]` | table skeleton | n/a | empty register message | error + retry | 401 → identity-scope message |
| `/compliance/customers/[id]` | 8 reads, one per tab | `identity/persons`, `identity/documents?identityId`, `aml/alerts`, `aml/cases`, `risk/decisions`, `complaints`, `aml/screening` (action), `security/pam/requests` | GET (+1 POST) | 11 tabs | per-tab skeleton | screening result | each tab states *why* it is empty | per-tab error card | documents tab has a dedicated locked state |
| `/compliance/transactions` | `RiskEngine` decision log | `GET /api/core/v1/risk/decisions` | GET | `MonitoringRow[]` | table skeleton | evaluation result row | "log is empty in this process" | error + retry | 401 message |
| run an evaluation | engine write | `POST /api/core/v1/risk/evaluate` | ref, entity, amount (minor units) | decision + signals | modal pending | decision appears in feed | — | engine `code` + hint | — |
| `/compliance/approvals` | `PrivilegedAccessEngine` | `GET /api/security/pam/requests` → `{data.requests}` | GET | `ApprovalRow[]` | skeleton | approval echo (+lease) | "nothing awaiting approval" | error + retry | 401 message |
| approve elevation | engine write | `POST /api/security/pam/requests/:id/approve` | `checkerEmail` from session | updated request | button-pending | lease window | — | **SoD violation surfaced verbatim** | — |
| decline | **does not exist** | — | — | — | — | — | — | — | no control is rendered (§88) |
| `/compliance/escalations` | `ComplaintDisputeEngine` | `GET /api/complaints?status&priority` | GET | `EscalationRow[]` | skeleton | transition echo | empty register message | error + retry | 401 message |
| status transition | engine write | `PATCH /api/complaints/:id {action:'TRANSITION_STATUS'}` | status, assignee | updated complaint | drawer pending | new status + SLA | — | engine error | — |
| `/compliance/reports` | reporting + obligation + restatement engines | `GET /api/v1/regulatory/reports`, `/obligations`, `/restatements` | GET | snapshots + dues + deltas | two skeletons | n/a (read-only) | per-panel empty | per-panel error | 401 message |
| file / restate | **GET-only routes** | — | — | — | — | — | — | — | page states why there is no submit button |
| `/compliance/risk` | decision log + scenario registry | `risk/decisions`, `aml/scenarios` | GET | bands, signals, rules | skeleton | n/a | "no decisions recorded yet" | error + retry | — |
| `/compliance/investigations` | case queue + network engine | `GET /api/aml/cases`, `GET /api/aml/network?entityId` | GET | board + graph | skeleton | n/a | both empty states | error + retry | — |
| `/compliance/watchlists` | **demo register** + live screening | none for the list; `POST /api/aml/screening` | POST name, jurisdiction | `WatchlistRow[]` + `ScreeningResult` | skeleton | result panel | "no lists registered" | error | n/a |
| `/compliance/system-health` | `ResilienceEngine` deep report | `GET /api/health` | GET | 1 `HealthRow` | detail skeleton | refresh | "no providers listed" | **no fixture fallback, by design** | — |
| `/compliance/integrations` | provider registry | `GET /api/health/providers` | GET | `ProviderRow[]` | cards skeleton | n/a | empty list ≠ all-green | error + retry | — |
| `/compliance/settings` | posture + session + local prefs | `GET /api/security/posture`, `/api/security/me` | GET | score, dimensions, actor | skeletons | preference applies instantly | — | posture unavailable state | 401 message |

## 4. Findings that changed the code (not opinions — defects found while wiring)

1. **`loadDetail` read the wrong table.** It looked up `LIVE_SOURCES['alertDetail']`,
   which does not exist (detail paths live in `LIVE_DETAIL_PATHS`), so *every*
   alert and case detail opened as `unavailable`. Fixed; `alt-01` now resolves to
   `ALT-2026-009182` with its narrative fields.
2. **The footer shipped a dead link.** `PortalFooter` builds `/{portal}/support`;
   the compliance portal has no support section, so every compliance page
   prefetched `/compliance/support` → 404. `PortalFooter` gained an optional
   `supportHref` and the compliance shell points at the shared `/support`
   console. Verified: zero 404 responses across 15 routes in a headless run.
3. **KYC document counts were invented.** `loadKyc` fetched the document vault
   without an `identityId`; the route returns `[]` in that case, so
   `documentCount` was always `0` — "no evidence on file" — for every person.
   The count is now `undefined` in the queue (rendered *Not reported*) and the
   vault is read once, per identity, when the customer file's Documents tab
   opens.
4. **Obligation and report fields were guessed.** They are not: `reportTitle`,
   `nextDueDate`, `submissionChannel`, `approverRole`, `makerPreparer`,
   `checkerApprover`, `snapshotHashSha256`, `reconciliationStatus` are the real
   keys, and monetary figures arrive in minor units. The mappers now read them,
   and the dashboard's deadline panel shows titles instead of codes.
5. **`AmlAlertRecord` has no notes field.** A "note" box in the disposition modal
   would have written nowhere, so it is gone and the modal says why. Same
   reasoning for complaints: `ComplaintDisputeEngine.transitionStatus` accepts
   `notes` and never persists them — the drawer explains that the narrative
   belongs to the case file.
6. **`PATCH /api/complaints/:id` is unauthenticated.** The route reads a body and
   mutates the complaint register with no `authenticateApiRequest` call, unlike
   its neighbours. The portal still sends the transition the officer asked for,
   but this is a **backend hardening item**, not a UI one: raise it with the
   service owner. (`/api/aml/alerts/:id`, `/api/aml/cases/:id` and the PAM
   approve route should be reviewed at the same time.)
7. **The screening adapter is a simulation.** `AmlScreeningProvider.screenEntity`
   answers from in-code mock lists. The call is real and its result is the
   engine's own, but the watchlists screen says plainly that a clean result is
   not a regulatory clearance. The list register itself has no endpoint at all,
   so it is demo-badged with zero counts and `NOT_CONNECTED` states.
8. **No decline for PAM requests.** The engine implements only
   `approveJitRequest`, enforced server-side against self-approval. The screen
   therefore offers approve (with the checker taken from the session, never
   typed) and nothing else.
9. **Compensation is reachable from the API and deliberately not from here.**
   `COMPENSATE` trusts `amount` in the request body. A console that cannot
   verify a redress figure against a settlement source should not host the
   button; the page states that choice in its data sheet.
10. **`/api/core/v1/risk/decisions` is empty in a fresh process.** That is the
    truth of a restarted engine, not a mapping bug, so monitoring shows an empty
    state plus the one action that can produce a record — running an evaluation.
11. **Locale interpolation.** The resolver only substitutes `{{param}}`; ten keys
    were written with single braces and rendered literally. Fixed across
    en/fr/ha, and `scripts/i18n-parity.mjs` (a `prebuild` gate) now reports
    2 187 keys with FR and HA complete for the compliance namespace.
12. **`PortalFooter` label leak** — none; noted here because the footer is shared
    with five other portals and only gained an optional prop, so no other
    portal's behaviour changed.

## 5. What is deliberately *not* done yet

- Legacy screens still on `ComplianceContext`: `kyc` review workspace, `kyb`,
  `edd`, `agents`, `merchants`, `sanctions`, `pep`, `adverse-media`,
  `restrictions`, `policies`, `team`, `audit`, `analytics`, `calendar`,
  `work-queue`, `aml`, `cases` + case detail, `transaction-monitoring`,
  `regulatory-reporting`. They render, they are not dead ends, and they are the
  next tranche — each one moves by replacing its store read with a resource key.
- `ComplianceShell.tsx` / `ComplianceContext.tsx` stay mounted until the last
  legacy consumer is gone (the layout currently nests both providers on purpose).
- AML rule editing, watchlist CRUD, report submission and complaint redress
  remain absent: no endpoints, no fake controls.

## 6. How to verify

```bash
node scripts/i18n-parity.mjs          # ✓ 2187 keys, FR + HA complete
npx --no-install tsc --noEmit         # clean
npm run build                         # ✓ compiles, 408 static pages
LD_LIBRARY_PATH=/tmp/qlibs/usr/lib/x86_64-linux-gnu node -e '…playwright…'
#   15 compliance routes: 200, rows on every live queue,
#   no pageerror, no response ≥ 400, no uninterpolated {{token}}s
```

Evidence in `qa-screenshots/`: `compliance-dashboard-1440.png`,
`proof-alerts-alt-01.png`, `proof-compliance-transactions.png`,
`proof-compliance-reports.png`, `proof-compliance-investigations.png`.
