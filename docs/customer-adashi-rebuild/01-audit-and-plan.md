# Customer Adashi — Privacy, UX, Real Payment Path, Auto-Collection & Reminders

Date: 2026-09-06 · Scope: `baiitax/Korie` @ `0957c72`
Status: audit + build (this workstream, staged commits)

## 1. Audit findings (evidence)

### 1.1 Customer Adashi page (`src/app/customer/adashi/page.tsx`, 247 LOC)
- **Fabricated identity**: hard-codes `currentCustomerId = 'cust-ng-101'` (an *agent-console* seed
  person, Amina Bello) while the real portal session resolves to
  `cust-ng-001-ibrahim` (Ibrahim Bello). Membership matching also guesses by phone/name.
- **No privacy**: the rotation timeline renders every member's full `customerName` + payout
  amount to every viewer; member phone/email travel in payloads.
- **Hard-coded money movement**: `handlePayObligation('obl-001')` pays a literal id; success is
  `alert()` only; the obligation card never verifies the *customer's* real next obligation.
- **Unauthenticated + unfiltered data path**: calls `/api/v1/adashi/groups` (open engine API,
  no bearer, no ownership scope) — bypasses the customer portal's
  `authenticateApiRequest` + `customerScopeFromRequest` discipline used by every other
  `/api/customer/*` route.
- Static fallbacks fabricate numbers (`|| 20000`, `|| contributionAmount × 0.985`).

### 1.2 Payment model review (Adashi → engines)
- `AdashiCycleObligationEngine.processContributionPayment()` marks an obligation **PAID
  unconditionally**: it invents `ledgerJournalId = JRN-…` and `paymentReference = PAY-ADA-…`,
  never debits a wallet, never checks funds, never touches the double-entry ledger or the
  customer subledger the portal displays. This is the payment-model gap.
- Real infrastructure that exists and is unused here:
  - `LedgerService.postTransaction` (double-entry, balancing checks, minor units) — `src/lib/services/LedgerService.ts`
  - `SubledgerEngine` (`CUSTOMER_WALLET` per customer/currency; `mutateBalance`; balances the
    customer portal actually renders via `AccountLifecycleEngine` sync)
  - `/api/customer/portal` auth + ownership pattern (bearer `kp_test_…`, scope resolver,
    owner-scoped rows) and `createSuccessResponse` envelope
- **No auto-collection**: nothing transitions `SCHEDULED → PENDING_AUTO_DEBIT → PAID/FAILED`,
  no due-date sweep, no grace/overdue progression, despite status vocabulary + `retryCount`
  existing in the model.
- **No notification/email engine** anywhere in `src/lib` (measured) — reminders cannot be sent.
- Cross-route durability: `AdashiStore`, `SubledgerEngine`, `LedgerService` are in-memory
  singletons (per-worker isolation proven earlier on this branch) → a payment posted through
  one route is not guaranteed visible through another.

## 2. Decisions (owner-confirmed)

- **D-A1 Privacy**: private by default per circle. Customer-facing view shows other members as
  initials + slot + status only; full names only for self and the current cycle's payout
  beneficiary. Per-circle privacy toggle (`INITIALS_ONLY` default / `MEMBERS_ONLY`) persisted;
  sanitization happens **server-side** so payloads never leak PII.
- **D-A2 Payment auth**: manual “pay now” requires a 6-digit transaction PIN (server-validated,
  attempt-limited + lockout — DEMO vault documented; production path = OTP/TOTP). Auto-debit
  only for members with an **authorized mandate**. Ownership + idempotency keys enforced.
- **D-A3 Email**: real SMTP transport when `SMTP_*`/`EMAIL_*` env vars exist (nodemailer);
  otherwise reminders are composed into an honest **outbox with QUEUED (DEMO, not sent)** state,
  visible in-app. No fake “sent” claims.
- **D-A4 Ledger truth**: contribution = real double-entry journal (debit customer-wallet
  liability, credit Adashi escrow pool) + per-customer subledger debit; journal/payment
  references come from the executed ledger records; insufficient funds ⇒ `FAILED` with
  `INSUFFICIENT_FUNDS`, never fabricated success.

## 3. Build phases (this workstream)

| # | Work | Gate |
|---|---|---|
| 1 | File-backed `AdashiStore`, `SubledgerEngine`, `LedgerService` (+ escrow accounts); env store paths | tsc 0; cross-route visibility |
| 2 | `EmailNotificationEngine` (outbox, SMTP when env, honest QUEUED/DEMO) + PIN vault + customer circles seeds (XOF-first + NGN, member = portal customer) | outbox rows; QUEUED when no transport |
| 3 | `AdashiCustomerCollectionEngine`: real ledger collect, ownership/PIN, mandate, auto-due sweep, overdue flagging, negative-balance reminder monitor | collect ⇒ wallet down + journal up; insufficient ⇒ FAILED + reminder |
| 4 | `/api/customer/adashi/*` BFF (auth + scope + privacy sanitizer) | 401 unauth; 403 cross-customer; masked roster |
| 5 | Customer page rework (identity from session, PIN modal, mandate/privacy controls, reminders, states) + EN/FR/HA keys | parity green; page renders from BFF only |
| 6 | Clean build + smoke suite + commit/push | build 404/404; smoke evidence |

**Out of scope (documented, later):** organizer/agent console privacy parity, payout-side
disbursement engine, real DB execution (R4 in system audit).
