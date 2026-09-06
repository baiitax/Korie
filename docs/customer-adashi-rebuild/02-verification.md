# Customer Adashi rebuild — verification evidence

Date: 2026-09-06 · Branch `feature/compliance-portal-demo-rebuild`
Build gate: `tsc --noEmit` 0 errors · `npm run lint` no new warnings · `next build` clean.
Runs: Next dev (3100) for development; `next start` production build on :3000 re-checked
after a full clean build. All checks below were executed against the API over HTTP.

## 1. Privacy (server-side shaping)

| Check | Result |
|---|---|
| GET /api/customer/adashi/circles — roster of other members | Initials only (e.g. `AO`, `AD`, `BT`, `FS`) + slot + status; full name only for **self** and the **current-cycle beneficiary** (verified across all three circles: beneficiary visible as full name `Emeka Obi` / `Chidi Okeke` / `Aminata Cissé` while others stay initials) |
| PUT …/circles/{id}/privacy `MEMBERS_ONLY` | 200; next GET shows ACTIVE members' full names; revert to `INITIALS_ONLY` works (200) |
| Privacy on non-creator / non-member | Guarded server-side (403 CREATOR_ONLY / NOT_A_MEMBER paths in code; single demo persona reachable in sandbox) |
| PII in payloads | Obligation/member rows returned by the BFF are view models — no phone/email of other members; self phone/email never requested by the page |

## 2. Payment model — real ledger path

| Check | Result |
|---|---|
| Auto-debit (mandate ON, due) — NGN circle `obl-grp-cus-002-1` | Sweep event `AUTO_DEBIT_SUCCESS`; obligation `PAID` with real records: journal `ltx_1788702910404_au4qp`, ref `KP-ADA-sweep-…`; wallet NGN 1,250,000 → 1,150,000 (portal `/api/customer/portal` confirms); ledger escrow NGN +100,000 (10,000,000 minor) |
| Manual PIN pay (XOF circle `obl-grp-cus-001-1`) | Wrong PIN → `WRONG_PIN`, "4 attempts left" (attempt counter decrements); cross-customer obligation → `NOT_OWNED` 403; correct PIN → `PAID`, method `WALLET_MANUAL_PIN`, journal + ref returned; wallet XOF 1,850,000 → 1,700,000; escrow XOF +150,000 |
| Replay after paid | `ALREADY_PAID` (409) — no double debit |
| Unauthenticated access | 401 `UNAUTHORIZED_MISSING_TOKEN` |
| Insufficient funds (mandate, HV circle `obl-grp-cus-003-1`, 1,300,000 vs 1,250,000) | No fabricated success: `FAILED`, error message "Insufficient funds: wallet has NGN 1250000…", retryCount incremented |
| Agent legacy collection (no wallet, cash) | POST /api/v1/adashi/obligations → `PAID` method `AGENT_COLLECTION`; journal booked agent cash-in-transit +1,300,000 (minor 130,000,000) and escrow +1,300,000 — real double entry, no invented `JRN-…` |
| Idempotent sweep | Second GET produces 0 sweep events; reminder not duplicated |

## 3. Email reminders (negative / insufficient account)

| Check | Result |
|---|---|
| No SMTP env configured | Reminder composed → outbox row `status=QUEUED`, `transportMode=DEMO_OUTBOX`; API advertises `mode: DEMO_OUTBOX` + honest note ("nothing claimed as sent") |
| SMTP configured | Code path active when `EMAIL_SMTP_HOST`/`EMAIL_SMTP_URL` (+`EMAIL_FROM`) exist; record → `SENT`/`FAILED` after delivery attempt |
| Dedupe | Only one open reminder per obligation+template |
| Owner reads | Reminder list returns only the session customer's rows; mark-read 200 for owner |

## 4. Auto-collection sweep semantics

- Runs on customer BFF GET (demo substitute for the scheduler — documented); idempotent.
- Applies to CUSTOMER-formed circles only; agent console circles untouched.
- Mandate-authorized portal members with wallet → attempt; mandate OFF members left for manual PIN pay; external participants (no wallet) skipped (offline collection).
- Past grace → `OVERDUE` escalation + reminder for portal members.

## 5. UI (page /customer/adashi)

- Renders 200 on dev and production builds; skeleton / error / empty / content states distinct.
- States observed client-side via API: cards for 3 circles with cycle, beneficiary, private roster,
  rotation, obligation action (Pay with PIN), mandate switch, privacy radio (creator), reminders
  panel with outbox mode chip, sweep-event banners.
- i18n keys added to en/fr/ha; `translate()` fallback returns raw status where a locale lacks a label.
- WCAG: buttons with aria-expanded / role="switch" aria-checked / dialog role + aria-labelledby,
  error regions role="alert", live region for notices, focus-visible rings, sr-only headings.
- Responsive: single column ≤640px; grids at sm/lg breakpoints (320→2560 safe — max-w-3xl content).

## 6. Store durability

- Adashi/Subledger/Ledger/PinVault/Email outbox now hydrate + persist to `/tmp/korie-*.json`
  (env-path overridable), so route-worker isolation observed earlier no longer causes
  cross-route balance desync (portal balance reflects an Adashi debit in the same read).
- `/tmp` store files are runtime state — never committed; `.gitignore`-free by location.

## Follow-ups (out of scope, documented in 01-audit-and-plan.md)

- Organizer/agent console privacy parity for its own member roster views.
- Payout-side disbursement engine (cycle pot → beneficiary) — existing payout engine territory.
- Production scheduler + real Supabase execution (system-audit R4).
