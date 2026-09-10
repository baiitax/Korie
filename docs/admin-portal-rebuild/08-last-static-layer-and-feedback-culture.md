# 08 — The last static layer goes: wallets, ledger, billers, dual control (GAP-5 + GAP-6)

Status: **IMPLEMENTED + GATES GREEN + LIVE-VERIFIED** (prod build on :3000) · Date: 2026-09-10 · Branch: `feature/compliance-portal-demo-rebuild`

## What was asked

Close the remainder of the admin-portal rebuild: GAP-1's declared next phase (`adminDataService.ts` still feeding
`/admin/{bdc,merchants,transactions,transfers,wallets}`), GAP-5's static merchant console and bill-payments shell, and
GAP-6's missing feedback culture (category Pareto, repeat-complainant flagging, agent-quality linkage — CSAT after
resolution shipped in GAP-2).

## Audit: what each page claimed vs. what existed

| Page | Claimed | Engine truth found | Verdict |
| --- | --- | --- | --- |
| `/admin/transactions` + `/admin/transfers` | "Real-time multi-currency execution", NIP routing, cross-border telemetry | `LedgerService` journals with entries + `BankCoreEngine` rail ops | **Rebuilt on the posted record** |
| `/admin/wallets` | Ledger vs available balances, "Freeze / Restrict" dual control | Subledger positions real; freeze executed **nothing** (modal resolved in component state, "audit log entry recorded" printed without writing anything) | **Rebuilt + freeze made real** |
| `/admin/bill-payments` | KEDCO + NIGELEC vending with token strings | `BillerServiceEngine`: 12-biller NG catalog, journaled payments, **no XOF billers, no token vending** — KEDCO/NIGELEC are not in the catalog | **Rebuilt on the till record** |
| `/admin/merchants` | Directory with GMV, settlements, QR counts, SLAs | No registry engine. `AgentMerchantIntelligenceEngine` holds invented GMV seeds with no provenance | **Withheld, with the check documented** |
| `/admin/bdc` | Licensed operators, vaults, spreads, compliance scores | No FX-operator engine; treasury/settlement engines carry no operator identity | **Withheld, with the check documented** |
| `/admin/cx` | (GAP-2 loop, no drivers) | Complaint book has category, customer, agent on every case | **Feedback-culture section added** |

## What was built

**1. Real dual control (the modal was theater).** `MakerCheckerModal.handleDecision` was a 600 ms `setTimeout` printing
"Approved & Executed / Cryptographic audit log entry recorded" while writing nothing and calling nothing. Now:
`POST /api/admin/maker-checker/decisions` persists every manual decision to the file-backed audit trail (hub Audit tab,
kind `MAKER_CHECKER_DECISION`); wired actions execute first so the entry records the true outcome; unwired actions
(`SETTLEMENT_OVERRIDE`, `LIMIT_ADJUSTMENT`, …) record as *recorded-only, nothing changed*; a checker email is required
because a dual-control decision must name its checker; if the record write fails the screen says the approval did not
happen. The auto-approve path now executes the wired call too instead of only finalizing automation audit.

**2. A freeze that freezes.** `AccountLifecycleEngine.applyRestriction` existed but no money path honored it — a FROZEN
account could still send and receive. `BankCoreEngine` now enforces: `FULL_FREEZE` blocks all directions
(`ACCOUNT_FROZEN`); `CREDIT_ONLY`/`DEBIT_ONLY` block the named side; `TRANSFER_DISABLED`/`WITHDRAWAL_DISABLED` block
the named rails. `BENEFICIARY_DISABLED`/`DEVICE_RESTRICTED` are recorded but unenforced (no beneficiary/device model),
and the API says so. Execution routes `POST /api/admin/wallets/[id]/restrict|lift` validate restriction, reason
(≥10 chars) and checker identity. The wallets console reads `GET /api/admin/wallets/overview` (lifecycle × subledger
× agent float × active escrow holds), with freeze/lift through the modal.

**3. Ledger activity.** `GET /api/admin/ledger/activity` merges posted journals (entries embedded) with bank-core rail
ops; the transactions console keeps search/filters/CSV-over-real-rows and gains expandable debit/credit inspection
(rail rows resolve their paired journal in-window); the transfers console shows internal + NIP rails with journal
links and per-currency moved totals. Filter options derive from the data — only states that exist are offered.

**4. Biller network.** `GET /api/admin/billers/overview` serves the 12-biller catalog with per-biller volumes from the
kiosk stream, the journaled payment list (phones masked), and settlement + commission liabilities read from the posted
ledger. The console states the bounds: NG cash-at-till only, no XOF billers, references not tokens.

**5. Feedback culture (GAP-6 closed).** `CxSnapshot.drivers`: category Pareto with cumulative share, repeat complainants
(2+ cases, masked phones, references), complaints-per-agent resolved against the agent registry (unregistered ids shown
raw), plus concentration warnings. Rendered as a new `/admin/cx` section with a link into the agents console.

**6. The fiction file is deleted.** `src/services/adminDataService.ts` (773 lines) had zero importers left and is
removed from the tree — `tsc` passing is the proof nothing referenced it.

## Verification (live, prod build, this session)

```
1. surfaces — /admin/{transactions,transfers,wallets,bill-payments,merchants,bdc,cx},
   /admin, /admin/support, /admin/disputes, /support, /support/tickets → all 200

2. money — open A 0363864592 + B 0652168571; fund A +₦60,000 (BK-CREDIT-MTV911T1-4);
   P2P A→B ₦15,000; NIP A→Zenith ₦5,000 (+₦10 fee)

3. ledger activity — 1 journal + 4 rail rows; rail row and journal share reference
   BK-CREDIT-MTV911T1-4; journal exposes its DEBIT/CREDIT legs with account names

4. wallets — 3 accounts / 2 agents / 0 holds; A avail ₦60,000 after funding

5. FREEZE — restrict FULL_FREEZE → FROZEN; debit frozen A → ACCOUNT_FROZEN;
   credit frozen A → ACCOUNT_FROZEN; console reads FROZEN, avail ₦39,990
   (60,000−15,000−5,000−10; frozen attempts moved nothing); lift → OPEN; P2P works
   refusals: short reason → REASON_REQUIRED; unknown id → ACCOUNT_NOT_FOUND;
   lift absent → RESTRICTION_ABSENT

6. audit — decision recorded (aud_rt1awb); unwired SETTLEMENT_OVERRIDE records as
   "recorded only — no execution engine is wired to this action, nothing was changed";
   kind filter MAKER_CHECKER_DECISION reads both entries back

7. billers — catalog 12 / 6 categories / 0 payments / liability 0; vend MTN Airtime
   ₦2,000 (+₦50 fee) via till API → KP-AGT-BILL-phase8-bill-0001, journal ltx_…;
   MTN {count 1, principal 2000, charges 50}; settlements 200,000 kobo (₦2,000 ✓);
   commissions 3,000 kobo (₦30 = 60% of ₦50 ✓); phone +234 ••• ••01

8. drivers — 3 new cases (repeat customer ×2 same agent+category, 1 single):
   pareto AGENT_OVERCHARGING 3 (60%) / FAILED_TRANSFER 1 / DUPLICATE_DEBIT 1 (seed);
   repeat +234••••101 ×2 refs; agents agt-ng-021 raw (unregistered),
   agt-ne-001 → "Sahel Kiosque Niamey", agt-ng-001 → "Garba Express Services & POS"

9. bundles — KP-W-, bill-091, MOCK_SUPPORT absent; KEDCO/NIGELEC survive only in the
   developer-portal API catalog, compliance/KYC fixtures and marketing copy (other
   surfaces, documented below); adminDataService: 0 refs in the server manifest
```

Gates: `tsc --noEmit` 0 · `next lint` 0 errors, 0 warnings in touched files · `next build` ✓
(new dynamic routes: `/api/admin/{ledger/activity,wallets/overview,wallets/[accountId]/{restrict,lift},billers/overview,maker-checker/decisions}`).

## Still out there (bounded, not hidden)

- **Other portals' fixture services** (`agent/merchant/support/customer/compliance/developerDataService.ts`) still back
  their own non-admin surfaces — e.g. developer-portal sample bodies naming `KEDCO_PREPAID`, KYC proof-of-address
  fixtures, marketing-page trophies. They were never part of the admin-console gap list; each needs its own audit
  before anyone treats those numbers as telemetry.
- **Unwired dual-control actions** (`SETTLEMENT_OVERRIDE`, `LIMIT_ADJUSTMENT`, `MANUAL_RECONCILIATION_ENTRY`,
  `ROLE_CHANGE`, `PROVIDER_FAILOVER`) record honestly but execute nothing — wiring each is a per-action engine task.
- **Account lifecycle is in-memory**: a restart returns accounts to OPEN while the file-backed audit entry persists —
  the wallets API states this, so a post-restart OPEN is read as registry state, not as a lifted freeze.
- **Unit boundary**: subledger positions are major units, ledger/holds minor — the APIs convert and label; the consoles
  print what the APIs label.
