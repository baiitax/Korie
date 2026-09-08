# Agent portal review — gaps, agent login credentials & UX pass

Date: 2026-09-08 · Branch: `feature/compliance-portal-demo-rebuild`
Scope: Deep process review of the agent portal (every `/agent/*` surface), the agent sign-in credentials on the shared login page, and a UX pass on the surfaces agents live in. Two owners asked: "what are we missing", "simplify and automate", "improve the UX", "review the agent login credentials on the login page".

---

## 1. Agent login credentials — review findings & fixes

### What was wrong (found by review)

| # | Finding | Severity |
|---|---|---|
| L1 | **No agent identity existed.** The single `/login` page is customer-flavoured ("Welcome back", customer subtitle). The AGENT persona was only a chip in the dev role-switcher. | High |
| L2 | **The password was never verified.** `AuthService.authenticate` accepted any password for any identifier; the 5-attempt lockout was dead code because failures were never recorded. The page pre-filled a password, implying protection that didn't exist. | High |
| L3 | **Identity mismatch:** signing in as AGENT produced a *customer* session — `Ibrahim Bello <ibrahim.bello@koriepay.ng>` — while every agent operation executes under the registered agency persona `agt-ng-001` (Garba Express Services & POS, Abuja). Login persona and portal persona disagreed. | High |
| L4 | No visible demo credentials for any role; reviewers had to guess identifiers (role keyword inside the identifier). | Medium |

### What changed

1. **`authService.ts` — demo credential registry + real validation.** Added exported `DEMO_CREDENTIALS` (one row per role, identifier + persona + note), `DEMO_PASSWORD`, and `buildDemoUser(role, country, identifier)`. `authenticate` now verifies the password **for real**: wrong password → `INVALID_CREDENTIALS` with remaining attempts; 5 failures → 15-minute `ACCOUNT_LOCKED` (the pre-existing limiter is now live).
2. **Persona alignment.** AGENT resolves to the registered agency operator — `Garba Musa`, `garba.express@koriepay.ng`, id `agt-ng-001` — in both password login and biometric/one-tap login (`AuthContext` now builds personas through the shared `buildDemoUser`).
3. **Login page UX (`/login`).** When the AGENT role is active the page switches to "Agent terminal sign-in" copy with an agency context card (Garba Express Services & POS · AGT-NG-0092 · TID-NG-009182, persona `agt-ng-001`); the identifier pre-fills the role's demo identifier; a role-adaptive **demo credentials** panel shows the identifier/password/persona with copy, and states plainly that passwords are verified with a 5-attempt lock.

### Evidence (compiled auth module, node assertions)

```
wrong password          → INVALID_CREDENTIALS "4 attempts left before a 15-minute lock"
5 wrong attempts        → ACCOUNT_LOCKED (15 min) — even the correct password is refused
correct demo credential → Garba Musa · garba.express@koriepay.ng · agt-ng-001 · route /agent
biometric AGENT         → same persona (no customer impersonation)
customer persona        → unchanged (Ibrahim Bello)
```

---

## 2. Deep process review — what an agent serves and what the portal covers

### Store-connectivity map ("every database")

| Store / engine DB | Agent surface that reads it | Status |
|---|---|---|
| LedgerService journal store (chart + transactions) | operations, liquidity, settlement, reconciliations, receipts | Connected |
| SubledgerEngine (AGENT_FLOAT, customer wallets) | portal summary float, account-rail ops | Connected |
| CashPositionEngine till + CashReconciliationEngine counts | dashboard till health, reconciliation, alerts | Connected |
| AgentKioskStore (ops stream, served customers, idempotency keys) | dashboard, transactions, commissions, customers | Connected |
| AgentManagementEngine registry (agt-ng-001) | profile, dashboard persona | Connected |
| TerminalManagement/DeviceManagement engines | profile/terminals, heartbeat alert | Connected |
| CustomerLifecycleEngine master | customer onboarding (registry + master) | Connected |
| **AccountLifecycleEngine accounts + wallet subledgers** | account rail deposits/withdrawals | Connected (Stage 4) |
| **BillerServiceEngine catalog/payments** | bills page | Connected (Stage 4) |
| **CardServiceEngine applications** | cards page lifecycle | Connected (Stage 4) |
| **FxDeskServiceEngine orders + FxPositionEngine rates** | FX page | Connected (Stage 4) |
| AdashiStore | adashi console | Connected (earlier stage) |
| ComplaintDisputeEngine | support tickets | Connected (via BFF) |
| Agent scope/credential sandbox map | every `/api/agent/*` | Connected |

Nothing material remains as an in-memory-only island; every money figure on agent pages traces to one of the above.

### Per-pillar process notes (simplification opportunities)

- **Deposit / Withdrawal** — flows are already journal-backed with account-rail support. Friction left: an agent cannot *look up* an account before serving (balance query would let cash-out pre-checks happen client-side). Queued: customer balance lookup on the serve screen.
- **Account opening** — opening an account currently requires the customer to have been onboarded at this terminal first; onboarding is one tap on Customers, then Open Accounts. Queued: single "Onboard + open" intent so the two-step collapses to one.
- **ATM lifecycle** — engine events only; the remaining manual work is operational (verification, handover). The page shows the next required action per application — keep.
- **FX/BDC** — quoted at engine reference ± spread; the till never carries XOF (documented seam). Simplification opportunity (queued): "how much XOF can I give for ₦X" quick calculator (naira-first entry) using the same quote function.
- **Bills** — denominations are one tap; multi-item baskets are out of scope (each payment is an independent journal + receipt, which matches till cash control).

### Findings register

| ID | Finding | Where | Priority |
|---|---|---|---|
| F1 | Dashboard quick actions predated Stage 4 — no product services on the home screen. | `/agent` | Fixed this pass |
| F2 | Recent-operations rows rendered every new product op with the generic transfer icon and "+₦0". | `/agent`, `/agent/transactions` | Fixed |
| F3 | E-float NUBAN + copy were client hard-codes in two pages (single source existed in constants, but pages bypassed it). | dashboard, liquidity | Fixed — now engine-registry field on the profile payload |
| F4 | "Today's volume — cash in + out + transfers" copy ignored product rails. | `/agent` | Fixed |
| F5 | Settlement page mentions hard-coded legacy rows in a code comment only (stale docstring). | settlement | Cosmetics (deferred) |
| F6 | Role-switcher badge "Cash In/Out" undersells the AGENT scope. | login dev bar | Fixed (badge now lists services) |
| F7 | Portal has no page-level session gate (BFFs are bearer-authenticated; pages render without a session marker). Acceptable for the sandbox demo; must be production gated. | `/agent/*` layouts | Queued (documented) |
| F8 | No customer balance lookup on serve screens; wallet guard exists server-side (already layered). | cash-out serve | Queued |

### UX improvements delivered (this pass)

1. Dashboard: new **product pillar row** (Open Accounts, ATM & Cards, FX/BDC Desk, Bills & Top-ups) with a link into the services hub; quick-ops row kept for cash/transfer/customers.
2. Shared `operationVisual()` glyph helper in the agent UI kit — every operation type (deposits, withdrawals, transfers, bills, FX, cards, account openings, account-rail variants) now gets its own icon/tone/label on dashboard + transactions, including receipts-ready labels.
3. Engine-truth NUBAN (registry `settlementAccountNumber`/`settlementBankName`) flows through the profile payload to dashboard + liquidity display/copy.
4. Copy refresh on stale claims (volume scope, empty states now mention all six product rails).
5. Login page: agent-aware headings, persona context card, role-adaptive demo credentials panel (see §1).

### Honesty notes
- The demo credential registry is a **sandbox** affordance: `DEMO_PASSWORD` is advertised on the login page, verified for real, and clearly labelled as a mock credential — never a production secret.
- Persona values mirror the agent registry seed (Musa Garba Enterprise / Garba Express Services & POS, `+2348031122334`, `garba.express@koriepay.ng`) — one documented mirror, flagged in code comments.
- All figures in this document come from engine responses/compiled assertions run against the reviewed build (2026-09-08), not hand-written claims.
