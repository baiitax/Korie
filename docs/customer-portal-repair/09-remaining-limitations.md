# 09 — Remaining limitations

Nothing here is a cosmetic caveat. If you are deciding whether this can face real
customers, this is the file to read.

## L1 · There is no bank on the other end — the provider leg is a stub

`src/lib/services/ProviderService.ts`, the Coris Bank adapter, in full:

```ts
const startTime = Date.now();
await new Promise(r => setTimeout(r, 150));
const providerRef = `KORIS-RTGS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
return { success: true, providerCode: this.CODE, providerReference: providerRef,
         responseCode: 'WAEMU_00', message: 'Settlement confirmed by Coris Bank Central Core node.', … };
```

`grep` for outbound HTTP (`fetch(` / `axios` / `got(`) across
`TransactionService.ts`, `src/lib/paymentSwitch/*.ts` and `ProviderService.ts`
returns **nothing**. So:

* the ledger projection, the double-entry post, the outbox record and the
  ownership rules are real code operating on real (in-memory) structures;
* the "corridor" answer — `SUCCESSFUL`, `KORIS-RTGS-…`,
  `Settlement confirmed by Coris Bank Central Core node` — is **generated in
  this process and cannot fail**;
* the customer-facing statement "Last updated …" and every status in History is
  therefore only as true as this stub. My end-to-end test in
  [07 §4](07-test-results.md) proves the *portal* is wired to the engine. It does
  **not** prove bank connectivity, and it must not be read as doing so.

No fake provider connection was invented to close this, and no
`SUPABASE_URL`/API-key wiring was added — that is the integration work the
product's own `BANKING_INTEGRATION_PLAN.md` describes.

## L2 · No persistence: an in-memory store behind every route

`transactionsStore`, `BeneficiarySecurityEngine`, `ComplaintDisputeEngine`,
`DocumentVaultEngine`, `CustomerLifecycleEngine` are process-lifetime maps.
Consequences, all observed while testing:

* restart the server and history is empty again;
* **in `next dev`, every on-demand recompile resets the store**, so a transfer
  executed in one request can vanish by the next (`✓ Compiled in 1132ms (889
  modules)` appeared between my two requests and the row disappeared). That
  artefact is why the E2E in 07 is run against the production build, and it is
  also what a customer on a redeploy would experience: a real, silent loss;
* uploaded KYC bytes live in the same in-memory vault — no object store, no
  encryption at rest, no retention policy, no download path for the reviewer.

## L3 · Identity is a mock, so multi-tenant isolation is proven in code only

See [05 §S1](05-security-findings.md). Any `Bearer` ≥ 16 chars authenticates, and
`customerScope.ts:55` maps the resulting `usr_dev_01` to one demo customer.
Ownership enforcement is correct-by-construction (a row is returned only if
`owner_customer_id === session owner`, and `owner_customer_id` is written at
execution time, never read from the client) — but with a single resolvable
identity, **no runtime test in this environment can prove two customers cannot
see each other's rows.** That test needs a real session with a second subject.

## L4 · Several customer features are deliberately not live

| Surface | State | Why it is not "broken" |
|---|---|---|
| Bills / airtime | `COMING_SOON` | no biller engine wired to the customer path |
| Cards | `cards: []` + `COMING_SOON` | no card service; fabricated card rows were removed |
| Scan-to-pay (`merchantQr`) | `COMING_SOON` | the old page simulated a camera scan |
| FX | quote path only, no `executeFxConversion` wiring | the swap write path is not customer-scoped |
| Device sessions / revoke | removed, "not available" | no session store exists (05 §S6) |
| 2FA / biometrics / PIN / password change | read-only status + desk routing | no enrolment or credential endpoints |
| Notification channel toggles | one "not wired to a backend yet" row | nothing persists them |
| CSV export | enabled only once data is loaded | exported from authorized rows; no server statement endpoint |

## L5 · Verification has no review callback

A submission is stored as `PENDING` and the portal says "Under review" — which is
true — but nothing transitions it. Until compliance (or a provider webhook) writes
the status, a customer who uploads correctly waits forever. Progressive steps,
tier gating and the 409 resubmission guard all work; the *outcome* does not
arrive.

## L6 · Hardening not applied (each one deliberate, see 05 for detail)

* **S7** — no rate limiting on `/api/customer/portal/{transfer,verification,disputes}`,
  although `src/lib/security/rateLimiter.ts` exists and is used by two `/api/v1` routes.
* **S8** — no CSP, HSTS, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy` or
  `X-Content-Type-Options`; no `src/middleware.ts`. Needs the inline theme script
  in `src/app/layout.tsx` to be allow-listed by hash, so it should ship as its own
  reviewed change with a report-only period.
* **S9** — the idempotency key is client-generated and not persisted server-side, so
  "one transfer per intent" holds within a submission, not across tabs or reloads.
* **S10** — `.gitignore` covers `.env*.local` but not plain `.env`.
* Receipts: `PNG/PDF export` and the print path are unchanged by this pass and
  were **not** re-verified beyond compiling and rendering the page — I am not
  claiming the exported artefacts are byte-perfect.

## L7 · No automated tests were added

There is no test runner in `package.json` (`scripts: dev, build, prebuild, start,
lint, i18n:check`; zero test dependencies). Everything in
[07](07-test-results.md) is a type check, a lint, a build, the repo's locale
parity check, three static-analysis scripts written for this pass (key existence,
namespace anchoring, placeholder substitution — deleted after use), and HTTP-level
checks against `next start`. **No
unit or integration test was added**, because adding a runner (Vitest/Playwright +
fixtures) is a project-infrastructure decision that changes CI, not a portal fix.
The three i18n scripts (`parity`, existence, placeholder) are the closest thing to
a regression net, and `i18n:check` now runs in `prebuild`, so a missing
translation fails the build.

Two classes of defect found in this pass are precisely the ones that need real
tests, and neither is covered by any check available here:

1. a locale key built by concatenation (`transactions.status${tx.status}`) —
   renders a raw key to the customer;
2. an uncalled readiness signal (`markBootstrapReady`) — made every first visit
   wait for a 9 s safety cap.

## L8 · Accessibility is asserted, not certified

Added: `role="dialog"` + `aria-modal` + Escape on the PIN sheet and the dispute
and ticket modals, `aria-live` on loaders and error states, labelled controls
(no unlabelled icon buttons for theme or balance masking), `aria-expanded` on FAQ
rows, focus-visible rings from tokens, and Light/Dark token-driven surfaces
everywhere I touched (the dispute modal and PIN sheet were hard-coded dark).

Not done: no axe/Lighthouse run, no screen-reader pass, no verified contrast
ratio audit, and no keyboard-trap test on the mobile More sheet. The brief asked
for accessible Light/Dark; the *implementation* follows the token system, but I
have not measured WCAG compliance and would not sign it off.

## L9 · Locale structure is only as safe as its checks

Adding 268 keys × 3 languages was done with a temporary injection script (deleted
after use — `scripts/` now contains only the repo's own `i18n-parity.mjs`). Two
things I got wrong on the way, recorded because they can recur:

* matching `loading: {` without anchoring the indentation wrote into
  `public.loading` instead of the top-level `loading` namespace — a key-existence
  check passes, the UI still shows the raw key;
* one cleanup regex removed the *original* `customer.settings` block (7 keys)
  instead of a newly created one. Recovered from `git show HEAD:` and re-injected,
  and `git diff`-based key counting confirmed `removed: 0`.

**Recommendation:** commit the three verification scripts from this pass into
`scripts/` and wire them into `prebuild`, so the namespace and placeholder
guarantees survive the next contributor. They are not in this push because they
were scratch tooling, and shipping half-audited dev scripts into a repo without a
tests directory deserves its own decision.

## L10 · The Vercel deployment was not compared

The brief mentioned `https://koriepayapp.vercel.app/` as the reference deploy.
This pass did not fetch or diff against it — everything here is judged against the
code at `8b39898` and against the directive. If the deployed app differs from the
repo (a different branch or an older build), the comparison still has to happen.

## L11 · Known cosmetic debt left in place

* `en.ts` keeps `usdName` / `usdShort` under `customer.accounts` although no
  customer surface can render USD (currency lists filter to XOF/NGN). Deleting
  them would touch a namespace shared with other portals, so they stay, unused.
* `support.disputeReasons` and `support.disputeLabels` overlap with the newer
  `support.reason*` keys the modal actually renders. Consolidating them means
  editing the modal's reason list again; left as dead-but-harmless keys rather
  than risk a half-migration.
* ESLint warnings elsewhere in the app (e.g. a `useMemo` dependency in
  `src/components/navigation/QuickSearch.tsx`) are pre-existing and untouched.
* `toCustomerTransaction` still builds a two-event `timeline` array of
  hard-coded English strings (`Transfer initiated` / `Funds moved`). It is carried
  in the API payload and **rendered by nothing** — the receipt explicitly avoids a
  timeline (`ReceiptDocument.tsx:21`) and the portal has no detail fetch
  (`CustomerContext.tsx:303` is the only customer call). So it is untranslated
  dead payload rather than a visible defect; localising it means changing the
  shared `CustomerTransactionTimelineEvent` type, which other portals use.
* `dbTransactionToUi` (`src/lib/engineAdapters.ts:95`) still exposes `id` and
  `providerReference`. No customer route uses it ([05 §S5](05-security-findings.md)),
  but it is a trap for the next person who reaches for the operator adapter.
* `SECURITY_SESSIONS` and `CUSTOMER_SUPPORT_TICKETS` still exist as fixtures in
  `src/services/customerDataService.ts` — nothing in the customer portal renders
  them any more, and the portal payload now returns `supportTickets: []` instead
  of the fixture array. Agency/merchant surfaces may still use them; removing the
  exports is a cross-portal change.
