# 04 — Implementation record

What was built, and the contracts it enforces. Read with
[01-root-cause.md](01-root-cause.md) — each entry here answers a cause there.

## Data access (new, 4 modules)

| Module | Lines | Role |
|---|---|---|
| `src/lib/customer/CustomerTransactionQuery.ts` | 460 | The only reader of transaction history for customer surfaces. Filters (currency / category / status / range / text), stable sort, opaque cursor, `totalCount`, `generatedAt` from the **server** clock. `MAX_PAGE_SIZE = 100`, `limit` clamped to `[1, 100]`. |
| `src/lib/customer/customerScope.ts` | 77 | The only answer to "who is asking". Session claim → identity-record match → sandbox shim (documented, single, exact-subject-gated) → else `ok:false`. No browser-supplied id is ever consulted. |
| `src/lib/customer/CustomerVerification.ts` | 290 | The only verification derivation: `deriveVerificationSummary`, `documentsForCustomer`, `TIER_CAPABILITIES`. Shared by the API and both UI consumers, so the KYC page and the dashboard prompt cannot disagree. |
| `src/lib/customer/customerApiError.ts` | 208 | `safeFetch` + `withCredentials`: `AbortController` timeout, and a normalized `{message, status, code}` for timeout / network / auth / permission / server / validation / client / unknown — the vocabulary every error state renders from. |

## API surface (customer-scoped)

| Route | Methods | Contract |
|---|---|---|
| `/api/customer/portal` | GET | Shell payload: customer, XOF-first wallets, first `DASHBOARD_WINDOW = 5` rows, `transactionSummary`, `cards: []` (COMING_SOON), `supportTickets: []`, real `fxRates`. No fixture substitution, no `fallbackUser`. |
| `/api/customer/portal/transactions` | GET | Paginated, filtered history for the session owner only. |
| `/api/customer/portal/transactions/[reference]` | GET | Detail; foreign **and** unknown references both 404, so existence is not leaking. |
| `/api/customer/portal/verification` | GET, POST | Summary + document registration (see [02](02-verification-audit.md)). |
| `/api/customer/portal/disputes` | GET, POST | Real `ComplaintRecord`s; the reference shown is the engine's `complaintReference`. |
| `/api/customer/portal/beneficiaries` | GET, POST, DELETE | Owner-scoped; engine enforces the 24 h new-payee cooldown. |
| `/api/customer/portal/notifications` | GET | Real unread count (drives the badge). |
| `/api/customer/portal/transfer` | POST | Ledger post → provider adapter → outbox; whole-unit amounts converted to minor units; the response status is the engine's. |
| `/api/beneficiaries` (legacy) | GET, POST, DELETE | Kept for other portals, now authenticated + session-scoped ([05 §S3](05-security-findings.md)). |

Shared rules: a route failure is a 5xx (structurally distinct from
`{items: [], totalCount: 0}`); `generatedAt` is the only "last updated";
projections are hand-built so no internal identifier can escape by refactoring
accident; `owner_customer_id` written at execution time is the only read
predicate.

## Screens

**Transaction history** (`customer/transactions/page.tsx`, rebuilt) — four
mutually exclusive states (`loading` / `error` / `empty` / `empty-after-filter` /
`ready`); server-driven filters with XOF-first currency chips; 320 ms debounced
search (`page.tsx:95`); cursor "Load older" (`loadMoreHistory`, line 343);
`DataFreshnessBar` + manual refresh; status polling only while a non-terminal row
exists, with backoff at 12 s then 30 s (lines 130-131); CSV export disabled until
`historyPhase === "ready" && items.length > 0` (line 190) and built from the
already-authorized rows, never from a server round-trip that could leak another
account; in-page detail sheet with an `onOpenReceipt` path into the real receipt
document. `cards` is not offered as a category, because the backend has no card
transactions.

**Verification centre** (`customer/kyc/page.tsx`) — see [02](02-verification-audit.md).

**Dashboard** (`customer/page.tsx`) — one row per concept: a fabricated
`statusTone`-derived badge was replaced by `notificationsCount` (capped "9+");
loading / error / empty branches; undefined-vault guard; funding CTA; the
transaction heading uses `transactionsTotalCount` rather than the 5-row window
length, so "5 transactions" cannot be displayed for an account that has 214.

**Wallets** (`customer/wallets/page.tsx`) — hierarchy is CURRENCY → BALANCE →
account number (balance at 28/34 px, dominant; account number in quiet mono
beneath), the eye sits **beside the balance**, masking is per-account and also
hides the ledger line, daily limit and account-number tail, no global duplicate
toggle, `KpaySectionLoader` while empty-and-loading, `DataEmptyState` + refresh
when the profile genuinely has no accounts. Clipboard copy fails silently rather
than claiming "Copied" (the previous code promised success unconditionally).

**Payments / QR** (`customer/payments/page.tsx`) — gated on
`isServiceAvailable("merchantQr")` (COMING_SOON) **and** an active wallet;
`handleConfirmPin` awaits `executeTransfer` and only claims success on
`result.success && result.transaction`.

**Send money** (`customer/send-money/page.tsx`) — the 800 ms post-response hold is
gone (the loader is dismissed in the same tick as the real outcome); the page no
longer crashes to a blank screen when the profile has no wallet: it renders the
loading / error / no-account states instead (`wallets` is legitimately empty
before the portal resolves, and the page used to dereference
`sourceWallet.availableBalance` unconditionally).

**Settings** (`customer/settings/page.tsx`) — section order
Security → Verification → Appearance → Language → Notifications → Profile/Support;
`ThemeSelector variant="segmented"`; EN/FR/HA chips with no flag graphics; the
three no-op notification switches replaced by one honest "not wired to a backend
yet" row.

**Security** (`customer/security/page.tsx`) — rewritten around real state only
([05 §S6](05-security-findings.md)).

**Support** (`customer/support/page.tsx`) — real cases through
`ComplaintDisputeEngine`; only categories that engine accepts; contact channels
render only when configured by env (`NEXT_PUBLIC_SUPPORT_{WHATSAPP,PHONE,EMAIL}`),
otherwise one honest "not configured" line — a placeholder phone number on a
banking portal is worse than an empty slot.

**Funding** (`customer/fund/page.tsx`) — source → destination → amount → review →
instructions; the fabricated `KP-FUND-…` reference and its copy-to-clipboard row
are gone; the review step shows the destination account (masked tail) instead.

## Shell, navigation, theme

`CustomerShell.tsx` — grouped nav (primary / services / account) with
Coming-soon pills on services the backend does not serve; sidebar Quick Balance
mirrors `isBalanceHidden` with no second toggle; the offline bar and the
data-unavailable bar are distinct messages with distinct affordances; the balance
eye moved next to the balance and the redundant top-bar control was removed.

`FloatingMobileNav.tsx` — serves the real workflows (Transactions included; Cards
no longer occupies a primary slot), plus the More sheet that carries the theme
control and the verification prompt (`verificationPending` /
`verificationRejected`).

Theme — `src/components/ui/ThemeContext.tsx` (`STORAGE_KEY = "koriepay_theme"`) plus the
pre-hydration script in `src/app/layout.tsx:107`, which sets the class and the
`theme-color` meta before first paint. Light is canonical and first; there is no
second bootstrap script and no flash. `ThemeSelector` offers only Light/Dark —
"System" is deliberately absent, because first-visit `prefers-color-scheme`
without live follow-through would be a control that quietly stops working.

## i18n

1278 EN keys (1010 at `8b39898`, +268), with FR and HA complete for every new
key. `npm run prebuild` runs `scripts/i18n-parity.mjs`, so a missing FR/HA value
now fails the build. Two structural rules were added while doing this, both
recorded because they bit me:

* **namespace anchoring** — `public.loading` and a top-level `loading` both exist;
  an injection that matches "the first `loading: {`" writes into the wrong parent
  and passes a key-existence check. Locale edits must be anchored by indentation
  depth.
* **no key concatenation** — `t("ns." + variable)` is how a UI ends up printing
  `transactions.statusSUCCESSFUL`. Label keys live in typed maps
  (`LABEL_KEY` + `transactionStatusLabelKey()` in `TransactionStatusBadge.tsx`).

Three verification scripts exist for this reason (existence, parameter
substitution, and key-shaped literals in variables) — see
[07 §i18n](07-test-results.md).

## Read-path integrity

These five were **not** found by reading the diff; they were found by running the
rebuilt app against its own API ([07 §4](07-test-results.md)). They matter because
each one was in a code path that had already been rewritten earlier in this pass —
a module comment claiming "customer-safe projection" is not a projection that is
customer-safe.

1. **`/api/customer/portal/transfer` had its own identity rule.** It called the
   shared `authenticateApiRequest` *and* kept a private `resolveCustomerId()`,
   whose final fallback was the demo customer. A session that resolved to no
   customer therefore executed money movements for
   `cust-ng-001-ibrahim`. The private resolver is deleted; the route uses
   `customerScopeFromRequest` and answers `403 CUSTOMER_IDENTITY_UNRESOLVED`.
   *Lesson recorded: auditing "which routes still read identity from the client"
   is not the same as auditing "which routes have a local fallback".*

2. **The transfer response carried `providerReference`.** That is the switch's
   upstream settlement id (`KORIS-RTGS-…`) — an internal correlation handle, not
   customer data. Removed by projecting through the shared read model instead of
   hand-assembling a response object.

3. **Status collapse in the read model.** `CANCELLED`, `REVERSED` and `DISPUTED`
   all mapped to `PROCESSING`, so a reversed transfer looked "still working".
   `mapEngineStatusToUi` (`src/lib/customer/CustomerTransactionQuery.ts:82`) now
   returns each state, and an unrecognised engine state maps to `PENDING` —
   "we do not know yet" — never to a success-shaped word. `CustomerTransactionStatus`
   gained `DISPUTED` (`src/types/customer.ts:27`).

4. **The ledger row `id` was being sent to the browser** by `toCustomerTransaction`
   (`id: tx.id`, observed as `id: "tx_1788631509476"` in a live response). Every
   read route uses that projector, so the whole portal was echoing internal
   primary keys. `id` is now the customer reference, with the reasoning in a
   comment at the site: the only consumer of `id` in the portal is a React key
   (`transactions/page.tsx:329`, `customer/page.tsx:204`), and the reference is
   stable, already visible and safe to key on.
   `dbTransactionToUi` (`src/lib/engineAdapters.ts:95`) still exposes `id` and
   `providerReference` — it is the *operator*-side adapter and is no longer used by
   any customer route, which is why the customer read path is clean rather than
   why the adapter was changed.

5. **A dispute is now visible where the money is.** Nothing in this repo can set
   `DISPUTED` on a transaction: `TransactionService` writes a status exactly twice
   and both are `'SUCCESSFUL'` (`:120`, `:259`); there is no status mutator, by
   design, because settlement state is not something a support case should edit.
   So `src/lib/customer/disputeStatus.ts` joins at read time instead —
   `openDisputeRefsFor(ownerCustomerId)` (scoped by the session's own customer id,
   `RESOLVED`/`CLOSED` excluded) and `withDisputeState(...)` — applied in the
   history route, the detail route, the dashboard payload and the notification
   source, so all four agree. The customer cannot change the ledger, and the
   customer is not told a settled transfer is merely "successful" while a live
   case is open against it. Verified: after `POST /disputes`, history, detail and
   the bell all read `DISPUTED`; after the case is closed in the compliance engine
   the row reverts to the ledger value.

### Constructed label keys (the same bug class the brief called out)

`src/app/customer/kyc/page.tsx` built four keys by concatenation —
`verification.state.${state}`, `verification.stepStatus.${step.status}`,
`verification.doc.${d.documentType}`, `verification.docStatus.${d.status}`. The
engine's values are `NOT_STARTED` / `COMPLETED` / `NATIONAL_ID` / `PENDING`;
the dictionary's keys are `notStarted` / `complete` / `nationalId` / `review`.
Not one of the state or document-type combinations resolved, so the KYC screen
could render `verification.state.NOT_STARTED` to a customer in English, French and
Hausa alike.

Fixed structurally rather than by adding a key:
`src/lib/customer/verificationLabels.ts` holds `Record<VerificationState, string>`
and `Record<VerificationStepStatus, string>` maps, so adding an enum member
without a label is a **type error** instead of a customer-visible raw key. The
document enums are plain records (the upload route owns `ALLOWED_TYPES`; a client
bundle must not import a route module). Every helper has a fallback that is honest
in the safe direction: unknown state → `Not available`, unknown document type →
`Supporting document`, unknown document status → `In review`, never `Verified`.
15 keys were added per language (`verification.state.{notStarted,inProgress,
submitted,verified,rejected,expired,retryRequired}`,
`verification.stepStatus.{notStarted,inProgress,submitted}`,
`verification.doc.{nationalId,passport,driversLicense,utilityBill,taxClearance}`),
taking the dictionary from 1 278 to **1 293** keys per locale, still parity-checked
in `prebuild`.

Two other constructed keys were checked and are fine: `transactions.cat.${tx.category}`
(all five uppercase category keys exist) and `services.${s.id}.comingSoonDesc`
(all four exist).

## Deliberate non-changes

No new ledger, no parallel transaction engine, no new routing model, no change to
banking business rules, no invented verification or notification backend. Where a
capability does not exist, the surface says so (`Coming Soon`, a disabled control
with a reason, or an empty list) — which is why several pages now look *less*
busy than before.
