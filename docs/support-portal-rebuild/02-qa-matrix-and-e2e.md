# KoriePay Support Portal Rebuild — §110–§115 QA Matrix & E2E

**Status:** All gates green, all 23 E2E checks passing (2026-09-06, production build).
**Companion doc:** [`01-audit-and-architecture.md`](./01-audit-and-architecture.md)

This document is the spec §111 deliverable: a requirement → test → method → result
matrix for the rebuilt Support Portal, plus the §110 WCAG 2.2 AA evidence and the
§112–§115 end-to-end harness documentation.

Everything below is measurement-based (house style, cf. `scripts/ux-sweep.mjs`):
scripts exit non-zero with a failure count, and every "PASS" below came from
running the named script against a **production build** (`next build` +
`next start`) — never the dev server (cold route compiles make UI timings
meaningless).

---

## 1. How to run the gates

```bash
# 1) i18n parity gate (also runs automatically as `prebuild`)
node scripts/i18n-parity.mjs          # exit 0 = every EN key present + non-empty in FR & HA

# 2) type safety
./node_modules/.bin/tsc --noEmit

# 3) lint
npm run lint

# 4) production build (includes the parity gate)
npm run build && npm run start        # keep it running for 5 & 6

# 5) WCAG 2.2 AA contrast (live measurement, both themes)
node scripts/support-contrast.mjs http://127.0.0.1:3000

# 6) end-to-end suite (12 API checks + 11 browser flows, Chromium headless)
node scripts/support-e2e.mjs http://127.0.0.1:3000
```

## 2. Gate results (final, 2026-09-06)

| Gate | Command | Result |
| --- | --- | --- |
| i18n parity (spec §84) | `node scripts/i18n-parity.mjs` | ✅ 2729 EN keys resolved in FR + HA, non-empty |
| Types | `./node_modules/.bin/tsc --noEmit` | ✅ clean |
| Lint | `npm run lint` | ✅ exit 0 (no errors) |
| Production build | `npm run build` | ✅ exit 0 |
| Contrast §110 | `node scripts/support-contrast.mjs` | ✅ 18/18 pairs ≥ 4.5:1, light **and** dark |
| E2E §112–§115 | `node scripts/support-e2e.mjs` | ✅ 23 passed, 0 failed (exit 0) |

Note on repeat runs: the store is in-memory per server process. The suite is
written to be safe against that — one check (A9) consumes a decision-eligible
dispute and returns `skip` on a second run against the same process instead of
failing. A fresh process (or server restart) always gives the full 23/23.

---

## 3. Requirement → test matrix (spec §111)

Method legend: **API** = `node` `fetch` against the live endpoints with the
sandbox Bearer token + an `x-kp-support-officer` header per check;
**UI** = Playwright Chromium driving the rendered portal; **BUILD** = compile
gate.

| Spec area | Requirement (summary) | Verified by | Method | Result |
| --- | --- | --- | --- | --- |
| §02/§04, §87 | Support is a service layer, never a financial source of truth; banking nodes are Coris Bank (NE) / Providus (NG), never "Koris"; XOF-first, never USD customer balances | A1 (health nodes + naming), A9 (recovery case reference created in `DisputeChargebackEngine`, support only stores the reference) | API | ✅ |
| §06/§07 | 8-state open lifecycle + terminal states; transitions server-authorized per role | A5 (walks NEW → … → RESOLVED using only `allowedTransitions`), A8 (TIER_1 blocked from close/escalate/decide with 403 `FORBIDDEN`) | API | ✅ |
| §17/§18 | Inbox: queue, live preview pane, URL-driven filters | U4 (row click → preview link → detail), U1 (filters render, no leaks) | UI | ✅ |
| §19–§23 (SLA) | Priority-based SLA (CRITICAL 15m/4h … LOW 8h/96h), pause on `WAITING_FOR_CUSTOMER`, resume on customer reply, at-risk ≤ 25% window | A2 (computed SLA per list row), A6 (pause/resume measured on the SLA clock), U4 (SLA badge renders translated state) | API + UI | ✅ |
| §28–§31 (disputes) | Disputes link to tickets/transactions; financial decisions only by the owning TIER_3 role or manager; approved refund/reversal creates an authoritative recovery case; support never touches balances | A9 (decision → `RESOLVED` + `recoveryCaseReference` persisted), A8 (wrong-role decision → 403 `FORBIDDEN_DECISION_OWNER`) | API | ✅ |
| §35–§36 (escalations) | Escalations with destination, status workflow, SLA due | U2 (escalation detail renders), U1 (list + filters) | UI | ✅ |
| §43 (knowledge) | Trilingual structured KB, per-language rendering, never mixed | U8 (EN → FR → HA article titles all distinct, `documentElement.lang` follows), U2 (article renders problem/symptoms/resolution/escalation) | UI | ✅ |
| §53/§54 (RBAC) | Capability matrix enforced server-side (rank + specialist gates); UI reflects but never enforces | A8 (negative RBAC matrix on the API), U6 (Assign visible to supervisor, hidden for TIER_1), A11 (search capability-gated) | API + UI | ✅ |
| §57–§59 (analytics) | Agents / SLA / CSAT analytics from real ticket data | U1 (all three tab routes render healthy) | UI | ✅ |
| PII (§60s) | Phone/email masked by default; unmask tier-gated and audit-logged | A10 (masked by default; TIER_1 unmask → 403), A12 (unmask appears in audit trail), U7 (360 mask/unmask round-trip in UI, bullets `•`, no double-plus) | API + UI | ✅ |
| §72/§73 (API contract) | Structured envelope, idempotency on creation, operational copy only (no internal leaks) | A3 (same idempotency key → same ticket + `idempotency_cached`), A11 (missing token → 401) | API | ✅ |
| §84 (i18n) | Zero hardcoded UI strings; EN/FR/HA parity enforced at build | BUILD gate + U1 (31-route sweep asserting no raw `supportOps.*` key renders, in EN and at 390px) | BUILD + UI | ✅ |
| §94 (notifications) | Notification feed per officer | U1 (notifications route healthy) | UI | ✅ |
| §100/§101 | Production support OS: real engine behind every page, no fabricated data | U2 (six detail routes render real seeded data: ticket / customer / transaction / dispute / escalation / KB), U3 (live KPI numbers), U5 (modal-created ticket visible on the API) | UI + API | ✅ |
| §107 (page map) | All support routes addressable and healthy | U1 (31 routes × body health + sidebar presence; detail routes in U2) | UI | ✅ |
| §109 (visual) | Customer-portal visual language: rounded glass, dark mode, mobile bottom nav | U9 (dark toggle swaps theme + background), U10 (visible keyboard focus), U11 (390px: bottom nav visible, sidebar hidden) | UI | ✅ |
| §110 (WCAG 2.2 AA) | Contrast ≥ 4.5:1 for normal text, focus visibility, `lang` attribute, aria labels on controls | `scripts/support-contrast.mjs` (18 measured pairs per theme), U10, U8 (`lang`), shell aria labels (officer switcher, language group, theme, filter selects) | measurement + UI | ✅ |

### Contrast detail (§110)

Measured live from the computed `.kp-support` token block, both themes,
WCAG relative-luminance ratios:

| Pair | Light | Dark | Min |
| --- | --- | --- | --- |
| Body text / background | 14.08:1 | 16.05:1 | 4.5 |
| Muted text / background | 6.42:1 | 9.29:1 | 4.5 |
| Secondary text / surface | 4.87:1 | 6.72:1 | 4.5 |
| Brand button text | 6.41:1 | 7.98:1 | 4.5 |
| Badge text / brand soft | 5.67:1 | 6.39:1 | 4.5 |
| Danger text / danger soft | 5.43:1 | 4.98:1 | 4.5 |
| Warning text / warning soft | 5.22:1 | 6.87:1 | 4.5 |
| Success text / success soft | 5.48:1 | 6.39:1 | 4.5 |
| Info text / info soft | 5.69:1 | 6.13:1 | 4.5 |

The contrast script reads `rgba()` **and** `hsla()` token serializations —
modern Chromium serializes some computed color tokens in HSL space, and the
measurement must not depend on which one it gets.

---

## 4. E2E suite (`scripts/support-e2e.mjs`)

Headless Chromium + Node `fetch`, measurement-based, exit code = failure count.
`node scripts/support-e2e.mjs [base-url]` (default `http://127.0.0.1:3000`).

### 4.1 API checks (A1–A12)

| ID | Check | Key assertions |
| --- | --- | --- |
| A1 | Overview KPIs + real health nodes | KPIs present; nodes are Coris Bank / Providus; the string "Koris" never appears |
| A2 | Ticket list SLA + filters | every row carries a computed `sla`; `?status=` filter respected |
| A3 | Idempotent creation | same idempotency key → same ticket id + `idempotency_cached: true` |
| A4 | Ticket detail contract | `sla`, `allowedTransitions`, `capabilities` exposed; role-filtered transitions |
| A5 | Lifecycle walk | NEW → RESOLVED using only server-authorized transitions; SLA `MET`/`MISSED` at the end |
| A6 | SLA pause/resume | `WAITING_FOR_CUSTOMER` pauses the clock; customer reply resumes it |
| A7 | Macro substitution | macro reply with `macroId` (no pre-filled content) → variables replaced, no leftover braces |
| A8 | RBAC negatives | TIER_1: close → 403, escalate-to-Finance → 403, decide dispute → 403 |
| A9 | Financial dispute decision | TIER_3_FINANCE `REFUND_APPROVED` → dispute `RESOLVED` + `recoveryCaseReference` created in the recovery engine and persisted (skips cleanly if the store already has no decision-eligible FINANCE dispute) |
| A10 | PII gating | phone/email masked by default; unmask succeeds for T3, 403 for TIER_1 |
| A11 | Search + auth | live search results; capability-gated; missing token → 401 |
| A12 | Audit trail | the unmask from A10 is recorded in the audit API |

### 4.2 Browser flows (U1–U11)

| ID | Check | Key assertions |
| --- | --- | --- |
| U1 | Route sweep | 31 support routes render >200 chars, no error boundary, no raw `supportOps.*` i18n key, no `undefined`/`NaN`, sidebar present |
| U2 | Detail routes | ticket (human-facing `KP-SUP-…` number), customer 360, transaction (Coris node), dispute (`DSC-…` number), escalation, KB article — all with real data |
| U3 | Dashboard | live KPI numbers + SLA section |
| U4 | Inbox flow | row click → preview link appears → detail page shows a translated SLA badge (waits for the badge text, not a fixed delay) |
| U5 | New-ticket modal | submit → toast carries the ticket number → the ticket is visible on the search API |
| U6 | Officer switcher RBAC | "Assign" action visible for the supervisor, hidden for TIER_1 |
| U7 | Customer 360 PII | masked by default (`•` bullets, single `+`), toggle reveals, unmask audited |
| U8 | KB trilingual | EN → FR → HA titles all distinct; `documentElement.lang` tracks the switch; restores EN for later checks |
| U9 | Dark mode | toggle sets `html.dark`, body background changes, toggles back |
| U10 | Focus visibility (2.4.7) | keyboard focus renders a visible outline |
| U11 | Mobile 390px | floating bottom nav visible, desktop sidebar hidden, no i18n leaks at mobile width |

### 4.3 Known stateful behaviors

- The suite creates a few tickets per run (marked with a run-unique marker)
  and consumes one FINANCE dispute (A9). Against a **fresh** server process all
  23 checks run and pass; against the same process afterwards, A9 reports
  `SKIP` (by design — it refuses to double-decide a dispute) and everything
  else still passes.
- U8 ends by restoring EN so later checks run in the default language.
- `goto()` in the suite retries up to 3× with backoff — production builds are
  used, so this only protects against transient stalls, never cold compiles.

---

## 5. Defects the suite caught (and their fixes)

The E2E suite exists to be run, and it earned its place: across four
production runs (13 → 18 → 19 → 21 → 23 passing) it surfaced and drove the fix
of every item below. App defects (not test bugs) in bold:

1. **KB article page crashed for every article** — the page called
   `article.body.body.split("\n\n")` but the API shape is
   `{title, problem, symptoms[], resolution, escalationCondition?}`. Fixed the
   page rendering, the `KnowledgeDto` client type, the list-page category
   filter (was 7 fictional categories), and added the real KB
   `categoryLabels`/`audience` values to all three locales.
2. **Recovery case reference never persisted on the dispute** (§31
   traceability gap) — `decideDispute` created the case in
   `DisputeChargebackEngine` but never stored `recoveryCaseReference` on the
   dispute. Now persisted in the update patch.
3. **Analytics page crashed on load** — the component was written against a
   phantom API contract (`agentStats`, `resolutionByPriority`, `csat.byLanguage`
   did not exist). `getAnalytics()` now returns those alongside the original
   `agents`/`overall` payload.
4. **Team page crashed** — rendered `o.jurisdictions.map()` (array) but officers
   have a single `jurisdiction`; the client `SupportOfficerDto` was also wrong
   (`active: boolean` / `phone` / `jurisdictions[]` vs the real
   `status: ONLINE|BUSY|ON_BREAK|OFFLINE` / `jurisdiction`).
5. **Assignee dropdowns were silently empty** — the ticket-assign and
   task-assign selects filtered officers by the nonexistent `o.active`, so no
   officer ever appeared. Now filter `status !== "OFFLINE"`.
6. **SLA badge rendered raw keys** — the component requests
   `supportOps.sla.${state.toLowerCase()}` (snake_case) while the locale had
   camelCase keys. Locale keys renamed to the actual lookup.
7. **~45 missing enum labels** leaked as raw `supportOps.*` keys (ticket
   categories/channels, dispute statuses/categories incl. `INCORRECT_AMOUNT`,
   escalation destinations, sentiment `CRITICAL_ANGRY`, task statuses, KB
   categories/audiences, role `TIER_3_TECH_OPS`, `ticket.category`/`assigned`
   labels, `customers.customer`). All added to EN/FR/HA; parity now 2729 keys.
8. **Escalation destination filters used values outside the union**
   (`BANKING`/`LEGAL`) — replaced with `BANKING_OPS`/`SETTLEMENT`.
9. **`maskPhone` double-plus** — non-digit strip now removes any non-digit run,
   so masked phones are `+227 ••• ••• 3344` (single plus).
10. **Macro-only API messages were 422** — `addMessage` validated `content`
    before macro substitution; a `macroId`-only POST (the API's documented
    contract) is now valid.
11. **Tickets POST required `customerName`** — the route now resolves
    `customerId` or a customer name (exact id → code → name → ≥3-char
    substring) server-side, matching the UI's behavior.
12. Test-suite fixes (not app bugs): UI asserts on human-facing numbers
    (`KP-SUP-…`/`DSC-…`) where the portal intentionally hides internal ids;
    A6's walk needed a visited-state set to stop oscillating; U9's theme
    button selector had to be language-independent (the `aria-label` is
    translated).

---

## 6. Out of scope / follow-ups

- **Persisted store**: the support store is in-memory per process (by design
  for this rebuild; spec §02 keeps finance in the authoritative engines). A
  durable store is a product decision, not a QA gap.
- **Cross-browser**: the suite targets Chromium (house standard, cf.
  `ux-sweep.mjs`). Firefox/WebKit are not exercised.
- **A11y beyond §110 baseline**: screen-reader pass and 400% zoom audit are
  recommended follow-ups; contrast, focus order/visibility, `lang`, and aria
  labels are covered above.
