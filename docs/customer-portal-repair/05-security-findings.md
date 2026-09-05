# 05 — Security findings

Ordered by what a customer's money is actually exposed to. "Fixed here" means in
this push; "open" means I am reporting it rather than pretending otherwise.

---

## S1 · The authenticated identity is a mock — **open, by design of the platform**

`src/lib/security/authMiddleware.ts` (unmodified in this pass; I did not touch it
because replacing it is an architecture decision, not a portal fix):

```ts
const isLiveKey = token.startsWith('kp_live_') || token.startsWith('pk_live_');
const isTestKey = token.startsWith('kp_test_') || token.startsWith('pk_test_');
if (!isLiveKey && !isTestKey && token.length < 16) { /* 401 */ }
…
const context: RequestContext = { …, userId: 'usr_dev_01', userRole: 'ORGANIZATION_ADMIN', … };
```

Any `Bearer` string ≥ 16 chars authenticates, gets the default scope list, and
becomes `usr_dev_01`. `src/lib/customer/customerScope.ts:55` then maps that
subject to `cust-ng-001-ibrahim`.

**Consequence:** the ownership rules in this push are correct but they sit on top
of an identity that is not real. Two customers cannot be isolated until a session
token is verified. **Every** route that uses this middleware shares the issue —
admin, agent, merchant, aggregator — so this is not a portal-local defect.

**Why I did not "fix" it:** a fix means choosing the session architecture
(Supabase JWT claim → `context.customerId`) and deleting the shim in one
movement across every portal. Doing that silently inside a customer-portal repair
would have been the larger error. What I did instead:

* `resolveOwnerCustomerId` reads `auth.customerId` **first**, so a real session
  starts working with zero page changes;
* the sandbox shim is the *only* remaining hard-coded identity in the customer
  read path, is gated on the exact `usr_dev_01` subject, and is documented as
  "remove together with the mock middleware, in the same PR that wires Supabase
  auth";
* `DEFAULT_SANDBOX_TOKEN` in `src/lib/customerPortalClient.ts` stays a documented
  test key, and `getPortalBearer()` is exported so `fetch` and `XMLHttpRequest`
  share one credential source instead of two copies of the same fallback.

**Blocker for production:** yes. Nothing here should face real customers until
this is replaced.

---

## S2 · One tap moved money without any check — **fixed**

`src/components/customer/ui/PinModal.tsx` at HEAD:

```ts
const handleBiometric = () => {
  // Biometric simulated authorization
  onSuccess("BIO_PASS");
  setPin("");
};
```

The tile was wired to the transfer confirmation path in `send-money` and
`payments`. It was not "biometric login": it was a button that satisfied a
payment authorisation prompt with a hard-coded string, in a modal that had no
`role="dialog"`, no focus trap, no Escape handler — and colours hard-coded to a
dark palette (`bg-[#090f1d]`, `text-white`) that inverted contrast in Light mode.

Now: the handler is gone (no simulated authorisation path exists at all), the
fourth digit hands control back immediately (the 150 ms `setTimeout` was
cosmetic), and the sheet is `role="dialog"` + `aria-modal`, closes on Escape, and
is painted entirely from theme tokens.

## S3 · An unauthenticated endpoint handed out any customer's payees — **fixed**

`src/app/api/beneficiaries/route.ts` at HEAD, verbatim:

```ts
const customerId = searchParams.get('customerId') || 'cust-ng-001-ibrahim';
const beneficiaries = engine.getBeneficiaries(customerId);
```

No auth, identity from the query string, and a *real customer id* as the default.
`GET` listed a victim's saved payees (names, banks, account numbers); `POST` could
add one to their account. Rewritten: `authenticateApiRequest` +
`customerScopeFromRequest`, the query string is never consulted for identity, a
`customerId` in the POST body is destructured away and replaced with the session
owner, and `DELETE` was added with `removeBeneficiary(id, owner)` so removing
someone else's payee returns 404 rather than succeeding.

## S4 · Ownership is now the only read predicate — **fixed**

* History, detail, disputes, documents and beneficiaries all resolve the owner
  from the session. There is **no** code path in `src/app/api/customer/portal/**`
  that accepts `customerId`, `userId` or `accountId` from the client — verified
  by grep, not by memory.
* A reference that exists but belongs to someone else, and a reference that does
  not exist, both return **404** with the same shape: the API cannot be used to
  test whether a reference exists.
* `fallbackUser()` (which invented `usr_dev_01`'s identity at HEAD line 109 of
  `api/customer/portal/route.ts`) is deleted. Unresolved identity → 403
  `CUSTOMER_IDENTITY_UNRESOLVED`.

## S5 · Projection discipline on customer responses — **fixed**

Every customer route builds an explicit projection instead of serialising an
engine record. Not returned: ledger row ids, org ids, idempotency keys, provider
codes/references/raw responses, `metadata`, `storagePathEncrypted`,
`fileSha256Hash`, `assignedTo`/SLA-breach fields on complaints, KYC internal
notes, risk scores, service-role data.

**This paragraph was a lie for most of this pass, and it is recorded as a finding
because of that.** The rewrite switched the transfer route to the shared read
model and I asserted "no ledger ids" from the module's own comment. A live
`POST /api/customer/portal/transfer` response said otherwise — `id:
"tx_1788631509476"` — because `toCustomerTransaction` still copied `tx.id`, and
*every* read route uses that projector, so the entire portal was echoing internal
primary keys while a code comment claimed the opposite. `providerReference`
(`KORIS-RTGS-…`) was also still on the wire from the hand-assembled transfer
response. Both are gone, verified by listing the keys of the JSON actually
returned ([07 §4.2](07-test-results.md): 23 keys, none of them internal, and
`id === reference`).

Residual, and deliberately not "fixed": `dbTransactionToUi`
(`src/lib/engineAdapters.ts:95`) still exposes `id` and `providerReference`. It is
the operator/admin-side adapter; no customer route uses it any more. Rewriting a
shared adapter to satisfy a portal contract would change other portals' payloads
underneath them — the customer surface is instead projected by
`CustomerTransactionQuery`, and the runtime check is what guarantees that.

The sha256 is computed on upload and kept server-side as an integrity record;
sending it to the client would let a caller confirm a guess about stored bytes.
Uploads are refused unless the *magic bytes* agree with the claimed MIME type
(`verification/route.ts:45-55`) — `Content-Type` is a client assertion, and the
vault will otherwise file `passwd.txt` as an `image/jpeg` identity document.

## S6 · Fake security affordances removed — **fixed**

| Affordance at HEAD | Why it was a security problem, not a UI problem | Now |
|---|---|---|
| "Log Out All Other Devices" filtered `SECURITY_SESSIONS` in local state and printed "All other active device sessions have been terminated." | A customer who believed they had evicted an attacker's device stops looking for other mitigations. False reassurance is worse than a missing feature. | Removed. Stated plainly: no session history exists in this deployment, so nothing can be listed or revoked. |
| 2FA + biometric switches that only set local state | "Require an SMS OTP … on every financial transaction" could be toggled ON, and the account was not protected. | Read-only status from `customer.mfaEnabled` / `biometricEnabled`, plus a note that the portal neither enrols nor toggles factors, routed to the desk. |
| `alert()` for Change PIN / Change Password | A native dialog masquerading as a credential flow. | Links to the support desk, which opens a real case. |
| Settings notification-channel toggles | Three switches with no backend. | One honest "not wired to a backend yet" row. |

## S7 · No rate limiting on money-movement routes — **open**

`src/lib/security/rateLimiter.ts` exists and is used, but only by two routes:
`api/v1/payments` and `api/v1/transfers/cross-border`
(`grep -rln "security/rateLimiter" src/`). No route under `api/customer/portal/**`
uses it — including `POST /transfer`. With S1 unresolved, that means no brute-force
ceiling on the transfer endpoint and no throttle on the upload endpoint. Given
`kyc:verify` is in the default scope list, the verification POST is also
unthrottled. This is a two-line change per route once the response envelope for
429s is agreed; doing it here without agreeing the 429 contract with the other
portals would have produced inconsistent error shapes.

## S8 · No response security headers — **open**

`next.config.mjs` sets `poweredByHeader: false` and `compress: true` and nothing
else: no `Content-Security-Policy`, no `X-Frame-Options` /
`frame-ancestors`, no `Strict-Transport-Security`, no `Referrer-Policy`, no
`X-Content-Type-Options`. There is also no `src/middleware.ts`, so nothing is
applied at the edge. For a banking portal with document upload, a CSP is the
single highest-value missing control. Deliberately not added in this pass: a
wrong CSP on 396 pages turns into a production outage, and it needs the inline
theme script from `src/app/layout.tsx` (the anti-flash bootstrap) to be
allow-listed by hash — that deserves its own reviewed change with a report-only
period.

## S9 · Idempotency is client-asserted — **open, mitigated**

`executeTransfer` sends `Idempotency-Key: cust-${Date.now()}-${Math.random()…}`.
Double-click and post-timeout retry within one submit are covered; a second
browser tab or a reload is not, because nothing persists the key. `TransactionService`
is the layer that should hold the dedupe (its own docs reference a DB guard);
until then the honest statement is "one guard per submission, not per intent".
Not fixed here because changing ledger write behaviour is outside a portal repair.

## S10 · `.env` is not gitignored — **open, trivial**

`.gitignore` lists `.env*.local` only. A developer creating a plain `.env` will
stage it with `git add -A`. One line to add. (No `.env` file is tracked today —
`git ls-files | grep '^\.env'` returns nothing — and no live key pattern
(`sk_live`, `AKIA`, private-key blocks) appears in `src/`.)

---

## What a production review must confirm, in order

1. Replace S1's mock bearer with the real session claim; delete `customerScope.ts:55`.
2. Add the CSP/HSTS/frame/referrer headers (S8) with the theme script hash, and
   a report-only week first.
3. Put the existing limiter on `POST /api/customer/portal/transfer`,
   `/verification` and `/disputes` (S7).
4. Persist idempotency keys in the ledger write path (S9).
5. `.env` in `.gitignore` (S10), and rotate the GitHub token that was pasted in
   plain text during this engagement — it was used for a single push and is not
   stored in the repo, in git config, or in memory.
