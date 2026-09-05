# KORIEPAY Customer Portal — Deep Functional Repair

Work performed on 2026-09-05 in a fresh clone of `https://github.com/baiitax/Korie`.

* **Baseline (the "before" state):** commit `8b39898` on `main`. Every "before" line
  number quoted in these documents was read out of that commit with
  `git show HEAD:<path>` — not from memory and not from a description.
* **Delivered state:** 104 changed paths in the working tree (see
  [`08-changed-files.md`](08-changed-files.md)), committed as one commit on top of `8b39898`.

## Read this first

`8b39898` already contained a **partial** repair pass (its own commit messages say
"XOF primary, NGN secondary, no USD", "harden customer/360 IDOR", "real transfer
path"). This document set describes only what this pass changed relative to that
baseline, and it is explicit about which defects the baseline still had. Several
headline items in the brief were **still broken at `8b39898`** despite those commit
messages — most importantly KYC upload simulation, dispute submission, the
notification badge, `/api/beneficiaries`, and the "Koris" spelling across 68 lines
in 56 files (that is the diff count: 68 lines carrying `Koris` removed, 71
carrying `Coris` added; 11 `Koris` spellings remain on purpose because they are
identifiers — `KORIS_NE`, `KorisBankAdapter`, `X-Koris-Latency`).

## Headline defects fixed in this pass

| Area | Defect that was live at `8b39898` | Now |
|---|---|---|
| KYC / verification | `src/app/customer/kyc/page.tsx:16` — `setTimeout(() => { setIsUploading(false); setUploadSuccess(true); }, 1200)`. No file left the browser. | Real multipart upload to `/api/customer/portal/verification`, vault write, `200 DOCUMENT_RECEIVED`, record at `PENDING`, summary → `SUBMITTED` |
| Disputes | `ReportDisputeModal.tsx` — client-side `KP-DISP-<random>` ticket id | `POST /api/customer/portal/disputes`, server `complaintReference` |
| Support tickets | `src/app/customer/support/page.tsx:24` — `KP-SUP-<random>`, list rendered from a fixture array | Real cases read/written through `ComplaintDisputeEngine` |
| Security page | `handleRevokeOthers` filtered a hard-coded device list and printed "sessions terminated"; 2FA/biometric toggles mutated local state | Status read from session; changes routed to the desk; no fabricated device list |
| PIN dialog | Biometric key called `onSuccess("BIO_PASS")` — one tap, no input, money moves | Removed; no simulated authorisation path |
| Funding | `KP-FUND-<random>` presented as a bank "Funding Reference" | Removed; instructions use the real account number |
| Notification badge | `src/components/customer/CustomerContext.tsx:125` — `useState<number>(3)` | Derived from `unreadCount` of the notifications route |
| `/api/beneficiaries` | No auth; `?customerId=` from the query string defaulting to `cust-ng-001-ibrahim` | Session-scoped, query identity ignored, DELETE added with ownership check |
| Portal identity | `src/app/api/customer/portal/route.ts:63` `fallbackUser(ownerCustomerId)` | Fails closed (403 `CUSTOMER_IDENTITY_UNRESOLVED`) |
| Brand | 68 lines of display prose across 56 files spelled the partner `Koris` while every engine string said `Coris` | Prose says **Coris**; identifiers, env keys, wire headers (`X-Koris-Latency`) and provider codes (`KORIS_NE`) left alone |
| Transfer route | `resolveCustomerId()` inside the route, whose final fallback was the demo customer — a session that failed to resolve still moved money for `cust-ng-001-ibrahim` | Shared `customerScopeFromRequest`, 403 `CUSTOMER_IDENTITY_UNRESOLVED` fail-closed |
| Response projection | Transfer response carried `providerReference` and collapsed `CANCELLED`/`REVERSED`/`DISPUTED` into `PROCESSING`; every read route echoed the ledger row `id` | Projected through `toCustomerTransaction`; `id` **is** the customer reference, so no internal identifier leaves the API |
| Disputes ↔ History | Filing a dispute changed nothing on the row, and the bell only fires on a ledger state the customer path can never set | Read-time join (`src/lib/customer/disputeStatus.ts`): an open case renders the row `DISPUTED` in History, detail and notifications, without the customer being able to write the ledger |
| KYC labels | `t(`verification.state.${state}`)`, `…stepStatus.${step.status}`, `…doc.${d.documentType}`, `…docStatus.${d.status}` — four constructed keys, none of which resolved in **any** language, so the screen could print `verification.state.NOT_STARTED` | `src/lib/customer/verificationLabels.ts`: typed `Record<Union, key>` maps (a new enum value fails the build) with honest fallbacks, plus 15 keys × 3 languages |

## What was deliberately *not* done

No new transaction engine, no new ledger, no new routing model, no parallel auth
system. The portal now reads and writes the engines the product already has
(`TransactionService`, `LedgerPostingService`, `BeneficiarySecurityEngine`,
`ComplaintDisputeEngine`, `DocumentVaultEngine` / identity engine) through
session-scoped routes. The one identity-layer gap that matters — the mock bearer
in `src/lib/security/authMiddleware.ts` — is **reported, not silently
redesigned** ([`05-security-findings.md`](05-security-findings.md#L1)).

## Documents

| # | Document |
|---|---|
| 01 | [Root-cause report](01-root-cause.md) |
| 02 | [Verification audit](02-verification-audit.md) |
| 03 | [Preloader / loading-state audit](03-preloader-audit.md) |
| 04 | [Implementation record](04-implementation.md) |
| 05 | [Security findings](05-security-findings.md) |
| 06 | [Performance findings](06-performance-findings.md) |
| 07 | [Test & verification results](07-test-results.md) |
| 08 | [Changed files](08-changed-files.md) |
| 09 | [Remaining limitations (read this before shipping)](09-remaining-limitations.md) |
