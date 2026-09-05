# 06 — Performance findings

Measured on this machine against this tree, not estimated. Where a number is a
build-output figure it is quoted exactly so it can be re-derived.

## 1. Payload sizes (production build, `npm run build` → `BUILD_EXIT=0`)

```
Route                                    Size      First Load JS
├ ○ /customer                          7.54 kB          184 kB
├ ○ /customer/transactions             6.72 kB          184 kB
├ ○ /customer/kyc                      8.74 kB          182 kB
├ ○ /customer/send-money               7.71 kB          183 kB
├ ○ /customer/wallets                   6.2 kB          180 kB
├ ○ /customer/support                   7.31 kB          181 kB
├ ○ /customer/settings                  5.52 kB          179 kB
+ First Load JS shared by all          —                 87.3 kB
  ├ chunks/2117-….js                                    31.7 kB
  ├ chunks/fd9d1056-….js                                53.6 kB
  └ other shared chunks (total)                          1.96 kB

395 static pages generated · 445 routes in the manifest
```

Page-level JS is 5–9 kB per screen; the customer portal is not paying for an
oversized route bundle. All ten `/api/customer/**` routes are `ƒ`
(`force-dynamic`), which is correct: nothing in them is cacheable per-customer
static content.

## 2. The real cost this pass added: the translation dictionaries

`src/locales/{en,fr,ha}.ts` are imported by `src/locales/index.ts`, which the
client `CustomerContext` imports — so **all three languages ship to every
customer on every page**, and the dictionary ends up in a shared chunk:

```
.next/static/chunks/7695-….js   184,112 bytes raw · 62,473 bytes gzipped
```

Per-file source growth from this pass:

| File | `8b39898` | after | Δ source | Δ gzip |
|---|---|---|---|---|
| `en.ts` | 54,666 B | 67,586 B | +12.9 kB | +3.8 kB |
| `fr.ts` | 60,986 B | 75,410 B | +14.4 kB | +4.2 kB |
| `ha.ts` | 56,051 B | 69,147 B | +13.1 kB | +4.0 kB |
| **all three** | 171.7 kB | **212.1 kB** | **+40.4 kB** | **+12.0 kB** |

+268 keys × 3 languages cost ~12 kB gzipped, loaded before first paint, on every
route, in a portal that shows exactly one language at a time.

**Recommended follow-up (not done here, it changes the i18n architecture):**
split by language (`next/dynamic` or a per-locale chunk + `React.lazy`) and by
portal — `src/locales/` already has separate `agency/`, `merchant/`,
`compliance/`, `developer/`, `support/` trees that the customer bundle does not
need, and `scripts/i18n-parity.mjs` shows the customer namespace is a subset of a
much larger dictionary set. Roughly two-thirds of that shared chunk is text no
customer will ever read. I did not do it because moving `translate()` to lazy
loading is a product-wide change that would touch all five portals in the same
diff as a customer-portal repair.

## 3. Query path

`CustomerTransactionQuery` (460 lines) does one pass over the owner's rows with a
`Map` index for reference lookups (`O(1)` detail fetch), sorts only the matched
set, and slices after filtering. `MAX_PAGE_SIZE = 100`, `DEFAULT_PAGE_SIZE`
smaller; `limit` is clamped rather than trusted. Cursor is opaque
(`offset|token`, parsed at line 310), so no client can request "everything".

This is the hot path that did not exist before: at `8b39898` there was no
per-customer query at all (`TransactionService` exposed
`getByReference(reference)` only), so every screen read the same pre-built array
and filtered it in the browser. Server-side paging is what makes the history
screen's cost proportional to the page instead of to the account.

**Honest caveat:** the underlying store is in-memory and *unindexed at rest*. A
real Postgres deployment needs an index on
`(owner_customer_id, executed_at DESC)` and a status filter index, or the
`matched.sort(...)` (line 359) becomes a per-request sort of every row the
customer owns. That is a migration task, not a portal change.

## 4. Round-trips on boot — one duplication left

`CustomerContext` mount effect (lines 386-391) fires three requests in parallel:

```
void loadPortal();            // shell payload, incl. first 5 history rows
void loadHistory();           // filtered history for the history screen
void refreshNotifications();  // unread count
```

`loadPortal` already returns `DASHBOARD_WINDOW = 5` rows *and* `loadHistory` runs
unconditionally, so on first paint the same ledger scan happens twice for a
customer who never opens the history screen. It is two in-process requests to the
same origin, so the cost today is small; on a real network it is one avoidable
round-trip per boot. The clean fix is to make the dashboard read
`historyItems` and drop `transactions` from the shell payload — that changes the
`/api/customer/portal` contract that other surfaces may adopt, so I left it and
am flagging it instead.

Things deliberately *not* done that would have looked like optimisations:

* No `SWR`/React-Query was introduced (new dependency, new invalidation model,
  and the brief says don't rebuild the product model).
* No request de-duplication cache in the client. Correctness of the ledger read
  beats a saved round-trip here.
* No virtualised list. History rows are 20/page; a windowed list would only be
  justified by a page-size increase.

## 5. Interaction costs

| Behaviour | Cost | Why it is acceptable |
|---|---|---|
| Search debounce | 320 ms (`page.tsx:95`) | one request per pause instead of per keystroke |
| Status refresh while a row is non-terminal | 12 s, then 30 s (lines 130-131), stops on terminal | `isLiveStatus`/`TERMINAL_STATUSES` is the single gate; a settled account polls zero times |
| CSV export | client-side blob from already-authorized rows | no server fan-out; disabled until `historyPhase === "ready"` (line 190) so an empty export cannot be produced |
| Upload progress | XHR `upload.onprogress` | byte counts from the network layer; no polling loop |
| Balance masking | local boolean in `localStorage` | a masked balance must not wait on the network (privacy is a render-time concern here, and the values are already in memory) |

## 6. Images, fonts, compression

No customer-facing page was given a new image asset; `next/font` self-hosting,
`compress: true` (gzip/brotli at the edge) and `poweredByHeader: false` are
unchanged in `next.config.mjs`. `compiler.removeConsole` keeps `error`/`warn` in
production, which is what I want on a money path — logs from a failed transfer
are the only way a customer-reported incident can be traced with no real backend
yet.

## 7. What I could not measure here

No load test, no Lighthouse, no real database: the app runs against in-memory
engines, so any p95 I printed would be a measurement of a mock. The numbers above
are bundle and query-shape facts; latency under load is not knowable in this
environment and is listed in
[09 — Remaining limitations](09-remaining-limitations.md).
