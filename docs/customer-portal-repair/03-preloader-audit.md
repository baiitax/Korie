# 03 — Preloader / loading-state audit

Inventory of every way this portal says "wait", audited against four rules from
the brief: no loader without an exit, no invented progress, no nested loaders,
and the full-screen loader is not the answer to every request.

## 1. The inventory

| Component | Kind | Driven by | Exit condition | Notes |
|---|---|---|---|---|
| `loading/BootstrapLoader.tsx` | brand reveal, full-screen | `bootstrapReady` in `LoadingContext` | first authoritative portal load resolves **either way**, floor 700 ms, hard cap 9 000 ms | armed once per session (`koriepay_loaded`); scoped to `/customer*` — see §3 |
| `loading/KpayFullScreenLoader.tsx` | full-screen shell | explicit `showFullScreen` / `hideFullScreen` | `hideFullScreen()` by the caller that opened it | `sticky` only for boot; mount-frame guard prevents a first-paint flash; 260 ms exit transition |
| `loading/KpayTransactionLoader.tsx` | money-movement overlay | `beginTransaction/updateTransactionStatus/endTransaction` | terminal status | exhaustive over all 8 `CustomerTransactionStatus` values; no percent; "do not retry" guidance while non-terminal |
| `loading/KpayPageLoader.tsx`, `KpaySectionLoader.tsx`, `KpayInlineLoader.tsx` | section / inline spinners | boolean the page already has | that boolean | `role="status" aria-live="polite"`, `aria-busy`; section loader takes `message`, never a fake label |
| `loading/KpaySkeleton.tsx` (+ `SkeletonTransaction`) | layout placeholder | phase === loading | replaced by content | sized to the real row so content does not jump |
| `loading/KpayProgress.tsx` | determinate bar | **a real number** | 100 % only on server answer | used only by upload byte progress |
| `customer/ui/CustomerStateViews.tsx` | `DataErrorState`, `DataEmptyState`, `TransactionHistorySkeleton`, `DataFreshnessBar` | normalized error / phase | n/a | the mechanism that makes *failure* look different from *empty* |

## 2. What was wrong at `8b39898`

| Finding | Evidence (HEAD) | Why it matters |
|---|---|---|
| The brand screen was a timer. `const finish = setTimeout(() => { hideFullScreen(); … }, 1100)` | `loading/BootstrapLoader.tsx:27-35` | On a slow portal fetch the brand screen dissolved into an empty shell (customers read that as "no data"); on a fast one it blocked a loaded app for a second. The loader was narrating a clock, not the app. |
| The transaction overlay had no rendering for two real states. Its local union was `PENDING \| PROCESSING \| SUCCESSFUL \| FAILED \| REVERSED` and `TERMINAL = ["SUCCESSFUL","FAILED","REVERSED"]`. `CANCELLED` and `DISPUTED` did not exist in it. | `loading/KpayTransactionLoader.tsx:9-13,32` vs the engine's `DISPUTED` ledger state | A cancelled or disputed transfer fell into the default branch — "still confirming" — for a transaction that had *stopped moving*. That is how a UI state-machine invites a duplicate submission. |
| No shared phase vocabulary. Every screen had its own `isLoading`; `CustomerContext.loadPortal` swallowed errors in `} catch {` (line 166), so a 500 rendered as the empty state. | `components/customer/CustomerContext.tsx:166` | "Loading", "empty", "unavailable" and "not yours" collapsed into one screen. |
| Upload "progress" was the same 1200 ms animation as the KYC submit. | `customer/kyc/page.tsx:16` | A progress bar with no bytes behind it. |
| Nothing timed out. Several `fetch` calls had no `AbortSignal` at all, so a hung request left its spinner up indefinitely. | portal fetch sites | The brief's "no loader may remain indefinitely". |

## 3. One defect of my own, found by this audit and fixed before push

`BootstrapLoader` was rewritten to wait on `bootstrapReady`, and its
`markBootstrapReady()` existed in `LoadingContext` — but **nothing called it**.
`grep -rn "markBootstrapReady" src/` returned only the definition and the
overlay's own destructuring. The consequence was the opposite of the intention:
every first visit idled until the 9 000 ms safety cap, because the signal the
gate waited for was never raised.

Fixed in this pass:

* `components/customer/CustomerContext.tsx` — `loadPortal()` now calls
  `markBootstrapReady()` on **both** paths (data resolved *and* normalized
  failure), and takes it from `useLoading()`;
* `customer/ui/CustomerShell.tsx` — `handleLogout()` calls
  `resetBootstrapReady()` and clears `koriepay_loaded`, so the next session is
  gated by its own data instead of inheriting this one's flag;
* `loading/BootstrapLoader.tsx` — the gate only waits on data it can observe:
  outside `/customer*` there is no portal load, so it hands off after the
  700 ms floor rather than sitting until the cap.

`tsc` cannot catch this class of bug (an uncalled callback is valid code), which
is why the gate is also asserted in the test list at
[07 — Test results](07-test-results.md) as *inspected, not executed*: there is
no browser/DOM runner in this repo, so I cannot prove the hand-off timing here.

## 4. Progress that is now honest

| Surface | Number shown | Source |
|---|---|---|
| Document upload | 0–99 % then 100 % | `xhr.upload.onprogress` bytes, `Math.min(99, …)`; 100 % only after the response |
| KYC checklist | "{{done}} of {{total}} steps" + one segment per step | `completedCount` / `requiredCount` from `deriveVerificationSummary` |
| Pending transfers on History | "{{count}} transaction awaiting confirmation" | count of non-terminal rows in the current page |
| Transfer overlay | status word + elapsed-time messaging (`providerWait` at ≥ 3 s, `longRunning` at ≥ 8 s) | real `TransactionStatus`; time is used only to *explain* waiting, never to advance a bar |
| Everything else | spinner, no number | — |

There is no percentage anywhere in the customer portal that is not a byte count,
a step count or a row count.

## 5. Rules encoded so they cannot drift back

1. **One full-screen at a time.** `LoadingContext` holds a single `fullScreen`
   slot plus a single `transaction` slot; a section loader is the only thing a
   page may add, and pages that show a section loader do not also show a
   full-screen one (History, Verification and Wallets were checked for this).
2. **Every fetch has a ceiling.** `safeFetch` wraps an `AbortController` with a
   15 s default (`PORTAL_TIMEOUT_MS` in `CustomerContext`), and the bootstrap
   gate has its 9 s cap. A timeout normalizes to a typed error, not a stuck
   spinner.
3. **Terminal means terminal.** `TERMINAL_STATUSES` in
   `TransactionStatusBadge.tsx` is the single definition of "nothing more will
   happen"; the overlay, the polling-backoff in History and the "live" dot all
   read it, so a disputed row cannot be spun as pending by one of the three.
4. **Failure is not emptiness.** `portalPhase` / `historyPhase`
   (`loading \| ready \| error`) plus `DataErrorState` vs `DataEmptyState` mean a
   500 says "unable to load" with a retry, and an empty account says "no
   transactions yet" without one.
5. **Skeletons match content.** `SkeletonTransaction` has no `rows`/`label`
   props and `KpayPageLoader`/`KpaySectionLoader` take `message` — the small
   compile-level guard that stops a page inventing a plausible-looking loader
   state that no other screen can render.
