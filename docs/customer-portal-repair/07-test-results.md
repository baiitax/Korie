# 07 — Test results

Everything below was executed in the sandbox against this working tree. Commands
are given so each result can be reproduced. Where a claim could **not** be tested
that way — the browser, the DOM, a real bank — it says so; §6 lists those
explicitly. No result in this file is inferred from a code comment.

## 1 · The static chain (eight checks)

Run in this order after the last source edit, in the same turn as the edits, with
`node_modules` present (`npm install` first — dependencies are not persisted in
this workspace):

| # | Command | Result |
|---|---|---|
| 1 | `npx --no-install tsc --noEmit` | exit **0**, no diagnostics |
| 2 | `node scripts/i18n-parity.mjs` | `✓ Translation parity OK — 1293 English keys resolved in FR + HA with values.` |
| 3 | `npm run i18n:check` | exit **0** (same script, via the `prebuild` hook) |
| 4 | key-existence script (temp) | `all 410 t() references resolve` — every literal `t("…")` in the customer surfaces names a key that exists in all three dictionaries |
| 5 | key-namespace script (temp) | `every key-shaped literal in customer surfaces resolves` — catches keys that live under the wrong root (`settings.*` vs `customer.settings.*`) |
| 6 | parameter script (temp) | `13 parameterised t() calls … every interpolation placeholder is supplied` — the `{{phone}}` / `{{count}}` class |
| 7 | `npx --no-install next lint --dir src --quiet` | `✔ No ESLint warnings or errors` |
| 8 | `npm run build` | `✓ Compiled successfully` · `✓ Generating static pages (395/395)` · `BUILD_EXIT=0`, 445 routes in the manifest |

`npx tsc` without `--no-install` is a trap: npm resolves a decoy package
`tsc@2.0.4` that type-checks nothing. Checks 4–6 were written for this pass and
deleted afterwards (rationale in [09 §L7](09-remaining-limitations.md)); 1–3 and
7–8 are the repo's own tooling and remain runnable.

### What those checks cannot see

The first version of the i18n sweep reported clean while four constructed keys on
the KYC screen resolved to nothing, because `t(\`verification.state.${state}\`)`
is not a literal: no key-existence regex can match it, and the *namespace* check
only tests strings. So checks 4–6 were extended to enumerate keys carried in
variables (`labelKey: "…"` + `t(r.labelKey)`), and finally §5 below greps
**template-literal keys specifically** and cross-references each interpolated
value set against the dictionary. That last step is what found the four KYC keys
and confirmed `transactions.cat.${tx.category}` and
`services.${s.id}.comingSoonDesc` are fine.

## 2 · Build output (cost of the work)

From `npm run build` (`.next` manifest, same run as check 8):

```
├ ○ /customer                                7.54 kB   185 kB
├ ○ /customer/fund                           5.14 kB   179 kB
├ ○ /customer/bills                          3.46 kB   177 kB
├ ○ /customer/cards                          3.20 kB   177 kB
├ ○ /customer/beneficiaries                  3.25 kB   179 kB
├ ○ /customer/adashi                         4.66 kB   172 kB
├ ƒ /api/customer/portal                     0 B        0 B
├ ƒ /api/customer/portal/transactions        0 B        0 B
├ ƒ /api/customer/portal/transactions/[reference]      0 B  0 B
├ ƒ /api/customer/portal/transfer            0 B        0 B
├ ƒ /api/customer/portal/verification         0 B        0 B
├ ƒ /api/customer/portal/disputes            0 B        0 B
├ ƒ /api/customer/portal/notifications       0 B        0 B
├ ƒ /api/customer/portal/beneficiaries       0 B        0 B
├ ƒ /api/customer/receipts/[transactionId]   0 B        0 B
├ ƒ /api/customer/360                        0 B        0 B
```

Every customer page is static HTML + ≤ 8.8 kB of page JS; the API routes are
dynamic (`ƒ`) and cost no client JS. Bundle and locale-size accounting is in
[06](06-performance-findings.md).

## 3 · Runtime harness

`npx --no-install next start -H 0.0.0.0 -p 3000` on the production build
(deliberately **not** `next dev`: with on-demand recompiles the in-memory stores
reset between requests — `✓ Compiled in 1132ms (889 modules)` appeared between two
requests and a row that existed in the first was gone in the second. Diagnosing
that correctly required ruling out the app, so it is recorded here and in
[09 §L2](09-remaining-limitations.md)).

Identity for the tests: `Authorization: Bearer kp_test_cdb3db2b9b22a98c9c1b` —
mock middleware ⇒ `usr_dev_01` ⇒ `cust-ng-001-ibrahim`
(`src/lib/customer/customerScope.ts:55`). Responses use the repo envelope
`{ status, code, message, data, meta:{ request_id, … , environment: "SANDBOX" } }`;
errors nest under `error`. There is no `success: true` field — asserted against the
captured JSON, because assuming it is how a "verified" claim gets invented.

## 4 · End-to-end results

### 4.1 Empty is honest

```
1) history before writes: totalCount=0  generatedAt=2026-09-05T18:21:07.706Z
   appliedFilters echo: {"currency":"ALL","category":"ALL","status":"ALL","range":"ALL","search":""}
11b) portal payload: wallets=['XOF','NGN'] cards=0 supportTickets=0
     txSummary={'totalCount': 1, 'window': 5, 'generatedAt': '2026-09-05T18:21:08.013Z'}
```

`totalCount: 0` before any write is the *correct* answer: `owner_customer_id` is
only ever assigned at execution time (`TransactionService:138`, `:272`), so the
store holds no rows owned by anyone — see [01](01-root-cause.md). Anything a
previous build showed there was fabricated. XOF-first wallet order, `cards: []`,
`supportTickets: []` are the de-fabricated shapes.

### 4.2 The money path and its projection

```
2) POST /transfer -> success/OPERATION_SUCCESSFUL tx.status=SUCCESSFUL ref=KP-2026-TX-1788632467723
   amount 1200 NGN -> 513 XOF @ rate 0.43 fee 6 bank Coris Bank Niger Republic
   internal fields in the response: NONE   |   id is the reference: True
3) history after: totalCount=1 rows=1 hasMore=False
   newest row is ours: True  status=SUCCESSFUL  category=TRANSFERS
```

The row was written by the engine (fee 6, rate 0.43, corridor named from the
switch's own data), not by a fixture, and became visible in History — the first
time that has been true in this app. Projection keys, verbatim:

```
['amount','category','completedAt','createdAt','currency','description',
 'destinationAmount','destinationCurrency','direction','exchangeRate','fee','id',
 'recipientAccount','recipientBank','recipientName','reference','sourceCurrency',
 'status','timeline','title','totalAmount','type']
```

No `providerReference`, `metadata`, `org_id`, `idempotencyKey`, `ownerCustomerId`,
`ledgerEntryId` or `routing`; `id === reference` (was `tx_1788631509476`).
**Important caveat on what "success" means here:** the provider leg is a stub
(`ProviderService.ts` sleeps 150 ms and returns `success: true` with a
`Math.random()` reference), and there is no outbound HTTP anywhere in the money
path. This test proves the portal is wired to the engine. It proves nothing about a
bank. See [09 §L1](09-remaining-limitations.md).

### 4.3 Read-path rules

```
4) detail by reference          -> success  status=SUCCESSFUL
5) unknown reference            -> HTTP 404 {"code":"TRANSACTION_NOT_FOUND","message":"We couldn't find that transaction on your account. …"}
6) filter matching nothing      -> HTTP 200 rows=0 totalCount=0
7) search matching / not matching -> HTTP 200 / HTTP 200
8) ?limit=5000 -> pageSize=100 (MAX_PAGE_SIZE) ; ?limit=0 -> HTTP 200 (falls back to DEFAULT_PAGE_SIZE=20)
```

Foreign and non-existent references produce the same 404 body, so the endpoint
does not confirm existence. An empty result set stays a 200 with `totalCount: 0`;
it is not dressed up as an error, and a route failure can only be a 5xx — the two
shapes are structurally distinct. `limit=0` is treated as "unspecified" rather
than rejected; noted, not changed.

### 4.4 Disputes, and the state a customer cannot forge

```
9) POST /disputes -> success case=CMP-2026-52981 status=OPENED amount=1200 NGN
   history status now: DISPUTED | detail status now: DISPUTED | dashboard row: DISPUTED
   notifications carry the dispute: True | items=2
   GET /disputes -> 2 case(s); newest keys: ['category','createdAt','currency','description',
     'disputedAmount','id','priority','status','ticketNumber','transactionReference']
   queue/SLA/notes fields withheld: NONE
```

The case lands in the same `ComplaintDisputeEngine` the compliance queue reads, the
disputed amount came from the ledger row rather than the client, and History,
detail, the dashboard and the bell all agree the row is `DISPUTED` — through the
read-time join in `src/lib/customer/disputeStatus.ts`, because the ledger has no
status mutator and a customer-facing route must not acquire one. Note
`GET /disputes -> 2`: one is the engine's own demo record for this customer, which
the compliance queue also sees ([09 §L11](09-remaining-limitations.md)).

### 4.5 Upload gates, on a fresh state

```
A) 9 MB PDF (over the cap)   -> 422 FILE_SIZE_INVALID      "The file must be between 10 KB and 8 MB."
B) PNG bytes named .pdf       -> 422 FILE_CONTENT_MISMATCH  "The file type doesn't match its contents."
C) documentType=BIRTH_CERTIFICATE -> 422 UNSUPPORTED_DOCUMENT_TYPE "That document type isn't supported."
D) 12 KB PNG, NATIONAL_ID     -> 200 DOCUMENT_RECEIVED
     document: { id: "doc_178863…", documentType: "NATIONAL_ID", verificationStatus: "PENDING" }
E) verification after accept  -> state=SUBMITTED 3/5 canSubmit=False
     documents: [{"documentType":"NATIONAL_ID","status":"PENDING","uploadedAt":"2026-09-05T18:21:36.316Z","numberMasked":"N/A"}]
   + 400-byte file -> 422 FILE_SIZE_INVALID (floor enforced server-side, not only in the form)
   + second upload -> 409 REVIEW_IN_PROGRESS  "Your documents are already with our review team."
```

Size is enforced in bytes on the server (both bounds), MIME is treated as an
assertion and checked against magic bytes, the type must be on the allow-list, and
acceptance is *asynchronous*: the record is `PENDING`, the summary becomes
`SUBMITTED`, and nothing in the response says "verified". 409 while a review is
in flight stops resubmission from both the UI and the API. The document `id`
returned is the vault's own document handle, not a ledger row id.

### 4.6 Auth matrix

```
11) no-auth /api/customer/portal                    -> HTTP 401
    no-auth /api/customer/portal/transactions       -> HTTP 401
    no-auth /api/customer/portal/verification       -> HTTP 401
    no-auth /api/customer/portal/notifications      -> HTTP 401
    no-auth /api/customer/portal/disputes           -> HTTP 401
    no-auth /api/beneficiaries                       -> HTTP 401   (was: open, ?customerId= honoured)
    short/garbage bearer                             -> HTTP 401
    POST /api/customer/portal/transfer with no auth  -> HTTP 401
```

Money-moving POSTs fail closed like the reads. A session that authenticates but
resolves to no customer gets 403 `CUSTOMER_IDENTITY_UNRESOLVED` from the transfer
route (exercised in dev by importing the scope resolver and asserting the shape:
`ok: False error: NO_IDENTITY` — the mock middleware always resolves
`usr_dev_01` on a valid bearer, so the 403 cannot be triggered from HTTP without
changing the auth shim, which is out of scope by design,
[05 §S1](05-security-findings.md)).

## 5 · Constructed-key audit (the check that found the KYC bug)

All template-literal keys in `src/app/customer`, `src/components/customer` and
`src/app/api/customer`:

| Call site | Value set | Verdict |
|---|---|---|
| `kyc/page.tsx` `verification.state.${state}` | 9 `VerificationState` values | **broken before the fix**: dictionary had `action/complete/na/review`; every value rendered a raw key |
| `kyc/page.tsx` `verification.stepStatus.${step.status}` | `COMPLETED/NOT_STARTED/IN_PROGRESS/SUBMITTED/ACTION_REQUIRED/UNAVAILABLE` | **broken**: keys were `complete/incomplete/na/review` |
| `kyc/page.tsx` `verification.doc.${d.documentType}` | 6 `ALLOWED_TYPES` values | **broken**: keys were `address/business/id_back/id_front/other/selfie` |
| `kyc/page.tsx` `verification.docStatus.${d.status}` | `VERIFIED/PENDING/REJECTED/EXPIRED` | **broken**: keys are lowercase |
| `transactions/page.tsx` + `TransactionRow.tsx` `transactions.cat.${tx.category}` | `TRANSFERS/BILLS/FX/FUNDING/CARDS` | ok — five uppercase keys exist |
| `bills/page.tsx` `services.${s.id}.comingSoonDesc` | `airtime/data/electricity/cableTv` | ok — all four exist |

Resolution: the four broken sites go through `src/lib/customer/verificationLabels.ts`
(`Record<Union, key>` maps ⇒ a new enum member is a type error, with safe
fallbacks), plus 15 keys per language (1 278 → 1 293). After the fix the keys the
KYC screen derives from the *measured* server values above are
`verification.state.submitted` → "Sent for review",
`verification.doc.nationalId` → "National ID (NIN)",
`verification.docStatus.review` → "In review" — and each of those resolves in en,
fr and ha.

## 6 · Not verified, and why

* **No browser, no DOM assertions.** Nothing in this environment runs a headless
  browser or a test runner (zero test dependencies in `package.json`), so no
  result above is a screenshot or a click-through. Rendering correctness of the
  rewritten pages — layout, overlay hand-off, the 700 ms/9 s preloader, focus
  order, theme flash — was established by reading the component tree and by the
  fact that every page prerenders and compiles. That is weaker than a browser
  test, and [03](03-preloader-audit.md) + [09 §L8](09-remaining-limitations.md)
  say so rather than implying otherwise.
* **Customer HTML is client-rendered**, so `curl /customer` returns the shell: API
  responses were the assertion surface, not HTML text.
* **Two customers cannot be tested**, because the mock identity resolves to one
  ([09 §L3](09-remaining-limitations.md)); isolation is enforced by a predicate no
  runtime probe in this environment can violate.
* **Provider connectivity**: the stub cannot fail, so failure/reversal paths
  (`FAILED`, `REVERSED`, `DUPLICATE_IDEMPOTENCY_KEY`) are verified at the
  projection and type level only.
* **Receipt PNG/PDF export, and the Vercel deployment** were not re-verified
  ([09 §L6, §L10](09-remaining-limitations.md)).
