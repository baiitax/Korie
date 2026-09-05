# 02 — Verification (KYC) audit

Scope: every surface that claims something about the customer's verification
state, and the write path that changes it.

## 1. What the audit found at `8b39898`

| # | Finding | Evidence (HEAD) | Severity |
|---|---|---|---|
| V1 | The upload was an animation, named as such: `const handleUploadSimulate = (e) => { e.preventDefault(); setIsUploading(true); setTimeout(() => { setIsUploading(false); setUploadSuccess(true); }, 1200); }` | `src/app/customer/kyc/page.tsx:13-16` | **Critical** — the customer is told a compliance obligation was met when nothing was recorded anywhere |
| V2 | There was no file input at all. The "drop zone" was a `<div>` with an `Upload` icon and a static caption (`customer.kycPage.cacPlaceholder`); nothing was wired to a picker, so no file could even be chosen. | `src/app/customer/kyc/page.tsx:84-88` | **Critical** (same blast radius as V1) |
| V3 | Verification state came from the *account* row, printed as a raw enum — `● {customer.kycStatus}` — not from the identity/document layer, and untranslated. | `src/app/customer/kyc/page.tsx:37` | **High** |
| V4 | The tier roadmap asserted outcomes: `TierRow … status={t("customer.kycPage.completed")}` for Tier 1 and `status={t("customer.kycPage.active")}` for Tier 2, hard-coded for every customer regardless of their profile; Tier 3 rendered as "available". | `src/app/customer/kyc/page.tsx:61-63` | **High** — a compliance screen claiming progress the backend never reported |
| V5 | The upload block was offered to everyone unconditionally as "upgrade to Tier 3": no per-tier requirement gating, and no concept of an in-flight review, so duplicate submission could not be prevented. | `src/app/customer/kyc/page.tsx:66-96` | **Medium** |
| V6 | No customer-scoped verification endpoint existed: `git ls-tree -r HEAD` under `src/app/api/customer/portal/` returns only `fx/`, `route.ts`, `transfer/`. The only document write path was an internal one (`/api/core/v1/identity/documents`) that a portal client cannot use without exposing internal identity ids. | `git ls-tree -r --name-only HEAD` | **High** — this is *why* V1 existed: there was nothing to call |

V1 is the one that matters. A simulated upload is not an unfinished feature; it
is a false statement to a customer about a legal obligation, and it silently
costs the operator an audit trail.

## 2. The real chain now

```
kyc page ──GET──▶ /api/customer/portal/verification
                        │
                        ├─ authenticateApiRequest(...)            # session
                        ├─ customerScopeFromRequest(...)          # owner id, fail-closed
                        ├─ CustomerLifecycleEngine                # customer master (tier, status)
                        ├─ documentsForCustomer(...)              # identity document records
                        └─ deriveVerificationSummary(...)         # THE single derivation
                                      │
kyc page ──POST FormData──▶ same route
                        ├─ ownership from session (never from body)
                        ├─ summary.canSubmitDocument  ── false ─▶ 409 REVIEW_IN_PROGRESS
                        ├─ type: allowlist MIME *and* magic bytes (JPEG/PNG/WEBP/PDF)
                        ├─ size: 10 KB … 8 MB (the client enforces the same 8 MB)
                        ├─ sha256 of the received bytes (integrity record)
                        └─ DocumentVaultEngine.uploadDocument({ uploadedByActorId: "portal:"+owner })
                                      │
                                      └─ record stays PENDING → 200 + DOCUMENT_RECEIVED
                                          (accepted, not verified; summary → SUBMITTED)
```

Files: `src/app/api/customer/portal/verification/route.ts` (186 lines),
`src/lib/customer/CustomerVerification.ts` (290 lines — the single derivation:
`VerificationState`, `VerificationStepStatus`, `VerificationStep`,
`VerificationSummary`, `documentsForCustomer`, `deriveVerificationSummary`,
`TIER_CAPABILITIES`), `src/components/customer/ui/DocumentUploader.tsx`
(284 lines), `src/app/customer/kyc/page.tsx` (336 lines).

Both API consumers (the KYC page and the dashboard prompt) call the same
`deriveVerificationSummary`; there is no second implementation of "what does
this customer still need". `canSubmitDocument` is computed there
(`state !== "UNDER_REVIEW" && state !== "SUBMITTED"`) and enforced server-side.

Magic-byte sniffing is not decoration: `Content-Type` is a client assertion, and
`DocumentVaultEngine` will store whatever bytes arrive, so a renamed
`passwd.txt` would otherwise be filed as a `image/jpeg` identity document.

## 3. Claims the UI is allowed to make now

| UI statement | Backing | Where |
|---|---|---|
| "{{done}} of {{total}} steps complete" | real `completedCount` / `requiredCount` from the summary | `kyc/page.tsx:172-174` |
| Segmented progress | `Array.from({ length: requiredCount })`, filled by `completedCount` — a count of steps, never a percentage | `kyc/page.tsx:164-170` |
| "Under review" banner | state machine includes `UNDER_REVIEW` / `SUBMITTED`; the API answers **200 `DOCUMENT_RECEIVED` with the record at `PENDING` — never "verified"** (measured; see 07 §4.5) | route |
| Upload progress 0–99 % | `xhr.upload.onprogress` real byte counts, `Math.min(99, …)`, 100 % only once the server has answered | `DocumentUploader.tsx:102-103` |
| "You can upload again once the review is complete" | enforced by the **server** (409 `REVIEW_IN_PROGRESS`), not by hiding a button | route |
| Per-document status / expiry / masked number | `verificationStatus`, `expiresAt`, `documentNumberMasked` projected from the identity record | `CustomerVerification.ts` |
| Camera capture | `<input accept="image/*" capture>` — the real OS camera, no simulated capture | `DocumentUploader.tsx:245-253` |

Progress that cannot be known is not shown: no "verifying…", no animated check,
no tier promise, no invented ETA.

## 4. Two defects in my own first pass, caught by audit

Both are the same class the brief warns about, and both would have shipped:

1. `t(\`transactions.status${tx.status}\`)` built locale keys by concatenation,
   producing `transactions.statusSUCCESSFUL` — a key that does not exist, so the
   row rendered the raw key to the customer. Replaced by the single
   `transactionStatusLabelKey()` map in `TransactionStatusBadge.tsx`, used by
   all three consumers.
2. Three keys were rendered with **unsubstituted placeholders** —
   `verification.stepCounter` (`{{current}}` never supplied),
   `verification.uploadTooLarge` and `verification.fileHint` (`{{limit}}` vs the
   `mb`/no-argument call). A key checker that only verifies existence cannot
   see this, so the audit added a placeholder check
   (`{{…}}` in the EN value ⇄ params at the call site): 13 parameterised calls
   checked, all supplied; no parameterised key is called with no arguments.

## 5. Data minimisation on this path

Returned to the browser: step status, document type, status, `expiresAt`, masked
document number, action labels.

Deliberately **not** returned: internal document id, encrypted storage path,
sha256 hash, reviewer identity, internal KYC notes, fraud/risk score, provider
routing fields. The hash is computed and kept server-side as an integrity
record — returning it would let a caller confirm a guess about the stored file.

## 6. Residual gaps on this path (repeated in 09)

1. **The vault is in-memory.** `DocumentVaultEngine` is the real code path the
   back office reads, but bytes do not reach object storage and this layer adds
   no at-rest encryption. The portal is now honest about a submission; the
   retention story is not production-grade.
2. **No review callback.** Nothing transitions `PENDING → VERIFIED` on its own; a
   reviewer must act in the compliance surface. Until that is wired, a customer
   who uploads will correctly sit at "Under review".
3. **Tier requirements come from `TIER_CAPABILITIES`**, a typed map in
   `CustomerVerification.ts` — not from a regulator rules table. It is the one
   place to edit, but it is code, not configuration.
4. **Phone/email steps stay `UNAVAILABLE`**, because `CustomerRecord` carries no
   `verifiedAt` for them. They render as "not available here" instead of being
   faked as satisfied — which means the "N of M steps" count can be
   conservative, never inflated.
