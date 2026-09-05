# 01 — Root-cause report

Baseline: `8b39898`. Everything below was confirmed by reading that commit
(`git show HEAD:<path>`), not by inference from the brief.

## Method

I did not start from the list of symptoms in the brief. I started from the data
path — *where does the number on this screen come from?* — because in this
codebase the symptoms all share one mechanism: a screen is bound to
`CustomerContext`, and `CustomerContext` is bound either to a static export in
`src/services/*Data.ts` or to nothing at all. Once you know which screens are
bound to the store rather than to the engine, the "many bugs" collapse into
three causes.

## Cause A — the portal was a presentation layer over fixtures, not over the engine

The product *has* a real transaction engine. `TransactionService`
(`src/lib/services/TransactionService.ts`) at HEAD exposed exactly four static
methods:

```
44:  static async executeCrossBorderTransfer(
192:  static async executeNipOutward(
305:  static async getByReference(reference: string): Promise<DbTransaction | null> {
314:  static getCrossBorderRate(
```

There is **no per-customer query**. `getByReference` takes one reference the
caller already has. So there was no path from "this customer" to "these
transactions" — not because the page forgot to call it, but because nothing
existed to call.

Consequences, all observed:

| Symptom | Mechanism at HEAD |
|---|---|
| History never changes / same rows for everyone | `src/app/customer/transactions/page.tsx` imported only `useCustomer` (line 5) and did `transactions.filter(...)` (line 60) over whatever the portal payload carried. Client-side filter over a fixed array, no query, no ownership, no pagination. |
| Every screen showed Ibrahim Bello | `src/lib/security/authMiddleware.ts:83` hard-codes `userId: 'usr_dev_01'`, and `src/app/api/customer/portal/route.ts:63` fell back to `fallbackUser(ownerCustomerId)` (defined line 109) when resolution produced nothing. A missing identity silently became *someone* — the demo customer. |
| Empty state == error state | `CustomerContext.loadPortal()` swallowed failures (`} catch {` at line 166 at HEAD), so a 500 and a genuinely empty account both rendered the same "nothing here" UI. |
| Badge always 3 | `src/components/customer/CustomerContext.tsx:125` was `useState<number>(3)`. |

**Why it survived review:** nothing on screen is ever *wrong*, it is only
*unbound*. A fixture renders at the correct size, with the correct currency
symbol, and passes a visual QA pass. The defect is only visible if you ask
"which table did this come from?".

**Fix direction taken:** keep the engine, add the missing read path instead of
inventing a parallel one — `src/lib/customer/CustomerTransactionQuery.ts`
(460 lines) is a *reader* over the existing ledger/transaction store with
ownership as its only predicate; `src/lib/customer/customerScope.ts` is the
single answer to "who is asking"; both fail closed. `fallbackUser` is gone.

## Cause B — UI states that were authored as animation, not as outcome

`src/app/customer/kyc/page.tsx:16` at HEAD, in full:

```tsx
setTimeout(() => { setIsUploading(false); setUploadSuccess(true); }, 1200);
```

That is the entire upload handler. No `fetch`, no `FormData`, no file read. The
same authoring habit — *decide what the screen should look like, then script the
transition to it* — produced:

* the dispute modal minting `KP-DISP-<random>` in the browser and calling it a
  ticket number;
* support tickets minting `KP-SUP-<random>` (`src/app/customer/support/page.tsx:24`);
* "Revoke other sessions" filtering a hard-coded device array
  (`SECURITY_SESSIONS` in `src/services/customerDataService.ts:472`) and printing
  "All other active device sessions have been terminated.";
* the PIN sheet's biometric tile calling `onSuccess("BIO_PASS")` — one tap, no
  input, money moves;
* `KP-FUND-<random>` shown to the customer as a "Funding Reference" to quote to a
  bank;
* a 150 ms `setTimeout` inside the PIN pad and an 800 ms one after a transfer
  response had already arrived.

**Root cause, stated plainly:** these are not three bugs in three files. They are
one habit — a state machine whose transitions are time-based rather than
event-based. `setTimeout(..., 1200)` is what you write when you know the shape of
"done" but not how done happens.

**Fix:** every one of those transitions is now driven by a response. Where the
backend genuinely has no capability, the control is **removed and labelled**
rather than simulated (sessions → `Coming Soon` chip + explanation; support
channel toggles in Settings → one honest "not wired" row).

## Cause C — no ownership contract, so identity had to come from the client

`src/app/api/beneficiaries/route.ts` at HEAD:

```ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId') || 'cust-ng-001-ibrahim';
```

Unauthenticated, and the *victim's* id is a query parameter with a real default.
This is the same cause as Cause A's second row, seen from the other side: because
the server never had a notion of "the customer making this request", every route
invented one from whatever the browser volunteered. Anything the browser
volunteers can be changed.

**Fix:** one resolver (`customerScopeFromRequest`), used by every customer route,
whose browser-supplied-input policy is "ignore the query string entirely"; the
legacy route now derives the owner from the session and keeps its response shape
for existing callers.

## Ranking

| # | Defect | Cause | Severity | State at push |
|---|---|---|---|---|
| 1 | Portal APIs trusted client-supplied identity; `/api/beneficiaries` unauthenticated with a real default id | C | **Critical** | Fixed (session-scoped + 403 fail-closed) |
| 2 | PIN sheet biometric tile authorised transfers with no check | B | **Critical** | Removed; no simulated authorisation path |
| 3 | "Revoke other sessions" and 2FA/biometric toggles that only changed local state | B | **High** (false claim about account safety) | Replaced by read-only status + desk routing |
| 4 | KYC upload simulated (`setTimeout(1200)`) | B | **High** | Real multipart upload + vault write + async review |
| 5 | Disputes / support tickets fabricated client-side | B | **High** | Real `ComplaintDisputeEngine` writes |
| 6 | No per-customer transaction read path; page filtered a fixed array | A | **High** | New query layer + route + rebuilt history page |
| 7 | `fallbackUser()` made a missing identity become the demo customer | A/C | **High** | Removed; 403 `CUSTOMER_IDENTITY_UNRESOLVED` |
| 8 | Errors rendered as empty state (swallowed `catch`) | A | **Medium** | `portalPhase`/`historyPhase` + normalized errors |
| 9 | Notification badge hard-coded 3 | A | **Medium** | Derived from `unreadCount` |
| 10 | Locale keys built by concatenation (`transactions.status${tx.status}`) | — | **Medium** (rendered raw keys) | Single `LABEL_KEY` map, three consumers |
| 11 | "Koris" in customer-facing prose (79 occurrences / 62 files at HEAD) | — | **Medium** (brand/trust) | 69 display lines corrected; identifiers untouched |
| 12 | No theme control reachable on a phone; balance mask duplicated in top bar | — | **Low/Medium** | Fixed — see [04](04-implementation.md) |

## What I deliberately did not "fix"

The mock bearer in `src/lib/security/authMiddleware.ts` (any `Bearer` of length
≥ 16 authenticates as `usr_dev_01` with a fixed scope list) is the deepest
problem in this tree. It is **not** a portal bug: it is the absence of the
identity provider the rest of the system expects. Replacing it means choosing a
session architecture, which is outside "deep functional repair" and would break
every other portal (admin/agent/merchant/aggregator) in the same commit as the
customer fix. The customer routes are written so that when a real session lands,
ownership resolution starts working with no page changes — that is the maximum
this pass can honestly do. See [05 — Security findings](05-security-findings.md).
