# KORIEPAY — ENTERPRISE FINTECH TECHNICAL RISK, OPERATIONAL RESILIENCE & ARCHITECTURE ASSESSMENT

**Role frame:** CTO Risk Officer · Senior Fintech Risk Analyst · Principal Financial Systems Architect ·
Banking Technology / Payment Systems / Cybersecurity / Fraud & Financial-Crime / Cloud & Infrastructure /
Data-Protection / Business-Continuity / Internal-Controls / Digital-Banking-Product Risk.
**Target:** `https://koriepayapp.vercel.app` + source tree (branch `feature/compliance-portal-demo-rebuild`
@ `52de43a`) + local production builds of that tree.
**Date:** 2026-09-10. **Classification:** internal risk working paper — evidence-graded, no maturity inferred from visuals.

## Evidence discipline (binding for this report)

Every material claim carries one tag. No tag = opinion, and opinions are labeled as such.

| Tag | Meaning in this report |
|---|---|
| [LIVE] | Observed against a running production build (`next start`) of the assessed commit on localhost |
| [SITE] | Observed on the public deployment via page fetch on the assessment date |
| [CODE] | Read in source, file:line cited |
| [DB] | Read in a database — **no database was available to this assessment; all DB claims are [UNK]** |
| [TEST] | Observed through an automated test |
| [ARCH] | Architecturally defined (engine/route exists and is structured for the purpose) |
| [UI] | Rendered by the interface with no backing implementation found |
| [MKT] | Marketing/site claim |
| [PLAN] | Acknowledged in code/docs as future work |
| [UNK] | Unknown — could not be verified from any available source |

"Website says" is never converted into "system implements." Where the brief asks about the Vercel deployment
specifically (TLS version, region, Vercel-team controls), the answer is [UNK] unless the page fetch proved it.

---

## 1. Executive Summary

**Primary-mission answer:** KoriePay is a **B. Prototype** with a **production-grade double-entry ledger core** —
not a production-ready financial institution, not safe for controlled launch without remediation, and not
institutionally scalable in its current persistence and authorization posture.

The split verdict matters because the codebase is genuinely two systems:

- **A real financial kernel [LIVE].** Double-entry journals balance on every sampled posting (funding, P2P,
  NIP-out with fee split, bill-pay 4-leg, consumer redress 5010→wallet); rail operations pair 1:1 with journals;
  restriction enforcement rejects frozen accounts with honest codes; dual-control decisions persist to a
  file-backed audit trail; intake whitelists defeated injection; idempotent account-open and bill-pay replays
  verified. This kernel correctly answers "where did every unit of money go" **inside one running process**.
- **A prototype shell around it.** Authentication is format-only (any self-minted `kp_test_` string authenticates
  with full scopes [LIVE]); every `/api/admin/*` route — including account freeze — is unauthenticated [CODE];
  OTP verification accepts **any** 6-digit code [CODE]; KYC verification returns `EXACT_MATCH 99.4 sanctions-clean`
  for garbage input [LIVE]; no server-side sessions, no server-side RBAC, no per-key credential registry [CODE];
  all financial state lives in process memory + `/tmp` JSON files that wipe on restart [CODE][LIVE]; webhooks are
  marked PUBLISHED without delivery [CODE]; FX rates are three disagreeing hardcoded sources [CODE]; 92 portal
  pages across merchant/aggregator/compliance make zero live calls [CODE]; automated test coverage of financial
  logic is effectively zero [CODE].

The ten systemic risks (§33) can each independently cause fund loss, ledger loss, mass account takeover,
large-scale fraud, or regulatory breach. None requires an exotic attacker: the KYC, OTP, auth and admin-API
findings are exploitable with `curl`.

**Go/no-go (§38): CONDITIONAL NO-GO → path to D (safe for controlled launch) exists** via the 30/60/90-day plan
(§37). The conditions are non-negotiable and ordered: credential-backed auth + admin-route authentication (days
0–10), honest KYC (verify or return UNVERIFIED), durable persisted stores with backup/restore proof, unique
transaction constraints + atomic balance mutation, server-side RBAC, webhook delivery or Honors-labeling, and a
reconciliation exception loop that a human actually works. The ledger core does not need replacement — it needs
protection, persistence, and proof.

**The ultimate-question answer:** today, management/finance/risk/compliance/regulators could **not** independently
determine where every unit of money went across restarts, tenants, and failures. After the 30-day remediation they
could for the NGN customer/agent slice; XOF corridors, BDC/FX, merchant acquiring and cross-border settlement need
the 60/90-day work because nograde-A engine truth exists for them yet.

## 2. Company/System Overview

KoriePay presents as unified financial infrastructure for Nigeria (NGN) and Niger Republic (XOF) across customers,
agency banking, merchants, BDC/FX, aggregators, developers and admin/compliance consoles [SITE]. The Torrensville
tree implements this as a Next.js 14 multi-portal monolith (~10 portals, 200+ pages) over a TypeScript domain-engine
layer (ledger, subledgers, bank core, complaints/disputes/chargebacks/refunds, treasury, settlement, risk/AML,
agency kiosk, workspace engines) with versioned REST BFFs (`/api/bank/v1/*`, `/api/v1/*`, `/api/customer/portal/*`,
`/api/agent/*`, `/api/admin/*`, `/api/developers/*`) [CODE].

**What the system demonstrably is [LIVE][CODE]:** an NGN-first wallet-and-rails prototype with double-entry
accounting, agency till operations with journaled bill-pay, an instrumented complaint→redress→CSAT loop, and an
admin console rebuilt onto engine truth (docs 01–09 on this branch).

**What it is not yet:** a multi-tenant authenticated institution (no credential registry, no server RBAC [CODE]); a
durable system of record (memory + `/tmp` [CODE]); a verified-identity platform (KYC/OTP findings [LIVE][CODE]); an
XOF-corridor or BDC/FX operator (no live corridor movement verified; FX static [CODE]); a webhook-integrated platform
(outbox never delivers [CODE]); an observed or recoverable estate (no DR evidence, no SIEM [UNK]).

## 3. Architecture Assessment

**Pattern [ARCH]:** modular monolith — Next.js App Router (RSC + client contexts per portal) → route-handler BFFs →
singleton domain engines → file-backed JSON stores (`/tmp/korie-*.json`, env-overridable) + in-memory Maps.
Supabase/Postgres is referenced in 2 routes but financial paths read engines, not tables [CODE]; a Supabase
connector template exists in the config hub as configuration surface, not as the system of record [CODE].

**Strengths [CODE][LIVE]:** clean engine boundaries (no engine imports UI); double-entry centralized in
`LedgerService.postTransaction` (sole mutator — no update/delete journal API); currency separation enforced by
convention and tests-by-battery (mixed-currency sums refused in reporting); envelope + error-code discipline on BFFs;
per-portal contexts limit blast radius of UI bugs.

**Structural weaknesses:** single Node process is the unit of consistency — no DB transactions, no row locks, no
cross-instance coherence [CODE]; Vercel serverless = each invocation may hold a divergent in-memory book and an
ephemeral `/tmp` [ARCH + platform semantics]; no event backbone (outbox marks PUBLISHED without transport [CODE]);
no service boundary between portals (one deployment, one failure domain) [ARCH].

## 4. Business Model Risk

| Pillar | Capability claimed [SITE] | Verified state | Grade |
|---|---|---|---|
| Customer | Wallet, transfers, bills, QR, analytics | BFF-backed transfers/txns/beneficiaries/disputes/CSAT [LIVE]; QR checkout = 201 theater (§6 risk); receipts fallback serves fixture rows [CODE] | Prototype, money real |
| Agent | Cash-in/out, POS, float, commissions | Till + bill-pay + fx POSTs journaled [LIVE]; kiosk file-backed; rogue-agent bounds untested | Prototype, money real |
| Aggregator | 35-page network console | 0 live calls; ₦184.9M commissions, HEALTHY liquidity, MATCHED recon — all static [CODE] | Concept |
| Merchant | Collections, QR, checkout, settlement, refunds | 0 live calls; ₦4.82M SETTLED batch, fake keys, unfired webhooks [CODE]; checkout mints unroutable NUBANs [CODE] | Concept |
| BDC/FX | Rates engine, treasury, bilateral settlement | No operator registry; 3 disagreeing static rate sources; no corridor movement verified [CODE] | Concept |
| Admin/Super-admin | Monitoring, limits, reversals, nodes, audit | Engine-backed consoles + real dual-control audit + enforced freezes [LIVE]; **all admin APIs unauthenticated** [CODE] | Real controls, no gate |
| Compliance | KYC/AML/screening/cases/reports | 41 pages, 0 live calls; DemoStrip on 23/41; sanctions screen unlabeled [CODE] | Demo console |
| Developers | APIs, SDKs, webhooks, status | 6/10 sampled endpoints exist; v2 tree 404s; logs/status/incidents fixture [CODE][LIVE] | Partial |

**Cross-cutting:** the business model assumes prefunded float, bank-node rails and BDC liquidity that exist in the
system only as SIMULATED-mode config + static balances [LIVE]. No component verifies external float [UNK].

## 5. Technology Risk

Stack: Next.js 14.2.15 (flagged by npm with a security advisory at install time [TEST-env]), React, TypeScript
(strict gates pass: `tsc` 0, lint 0 errors on touched paths [TEST]), no ORM-backed persistence in financial paths.
**Duplication:** `/customer` ≡ `/customer` byte-identical (34 pages maintained twice) [CODE]; gateway vs
integration engine folders flagged for reconciliation since doc 01 [PLAN]. **Frontend financial math:** FX estimate,
fee display and swap preview compute client-side; execution amounts are re-derived server-side on tested paths
(fee ₦10 applied in-engine [LIVE]) — residual risk is quote/proceed divergence, not ledger corruption. **Secrets:**
env-only convention verified (0 raw secrets in stores, masked previews) [LIVE]; no hardcoded secrets found in
`lib/`+`api/` scan [CODE]. **Dependencies:** 400 packages, no lockfile audit performed [UNK]; Next.js advisory
unpatched [TEST-env].

## 6. Cybersecurity Risk

| Control | Claim | Evidence | Result |
|---|---|---|---|
| API authentication | "Secure" platform [MKT] | Format-only: any `kp_*`-prefixed/≥16-char bearer authenticates, fixed full scopes, self-declared env [CODE][LIVE] | **FAIL — CRITICAL** |
| Admin API auth | Implied by consoles [UI] | 0/4 sampled `/api/admin/*` routes check auth (incl. wallet freeze) [CODE] | **FAIL — CRITICAL** |
| MFA/OTP | "Dynamic OTP challenge-response" [MKT] | `verify-otp` returns `verified:true` + minting `kp_sess_*` for **any** ≥6-digit code [CODE] | **FAIL — CRITICAL** |
| Sessions | Login/logout/mfa routes exist [ARCH] | No server-side session store; logout cannot invalidate; OTP session token unregistered [CODE] | **FAIL — HIGH** |
| RBAC | "Granular RBAC" [MKT] | Zero role checks in any API route; portal separation is client-side routing [CODE] | **FAIL — HIGH** |
| TLS 1.3 | Claimed [MKT] | Deployment property; no config in repo, no vercel.json [UNK] | **UNVERIFIED** |
| AES-256 at rest | Claimed [MKT] | No AES in tree; PINs = single-round salted SHA-256 (no bcrypt/argon2); stores are plaintext JSON [CODE] | **FAIL — HIGH** |
| Rate limiting | — | 3 v1 routes + login limiter (in-memory, per-instance) [CODE] | Partial |
| Anomaly telemetry 24/7 | Claimed [MKT] | `EarlyWarningEngine`, `RiskDecisionEngine`, `/api/core/v1/risk/*` exist [ARCH] but are **not called by any money route** [CODE] | **FAIL (unwired)** |
| Auditability | "Comprehensive" [MKT] | Real: dual-control audit, automation audit, complaint history, journal narration [LIVE]. Missing: privileged-action attribution on admin APIs (no auth → no actor) [CODE] | Split |

**Method note:** no penetration test was performed; findings above are design-level and reproducible with `curl`.

## 7. API Risk

**Trust boundary [CODE]:** complaint intake whitelists + rebuilds records (injection defeated [LIVE]); wallet
restrict validates restriction/reason/actor [LIVE]; transfer routes accept client `amount/currency/accounts`
with **no KYC/tier/limit/velocity checks** in route or `TransactionService` [CODE]. **Idempotency:** bill-pay
idempotency-key map + account-open idempotency verified [LIVE]; bank transfer refs are `Date.now`+random with **no
unique constraint** — double-submit = double debit [CODE]. **State machine:** complaint/dispute lifecycles are
whitelisted transitions [LIVE]; bank/ledger postings are one-way (no FAILED→SETTLED path exists because no async
state machine exists — synchronous post-or-reject) [ARCH]; settlement batches have create→approve→execute [ARCH].
**Versioning:** `/api/v1/*` heavily populated; documented `/v2/nip-gateway` 404s [LIVE]; breaking-change policy
[UNK]. **Docs-vs-real:** 4/10 sampled catalog endpoints missing [CODE].

## 8. Database Risk

There is no operational database behind financial flows: Supabase appears in 2 routes (one is a comment + engine
reads; one is a health route) [CODE]. Consequences: **no RLS to assess** (nothing is behind it); no FK/unique/check
constraints; no transactions; no audit tables at the storage layer (audit lives in the same JSON files as the data
it audits [CODE]); frontend cannot reach tables directly only because there are no tables. Persistence = process
memory (complaints, subledgers, accounts, kiosk ops partially) + `/tmp/korie-*.json` (ledger, bank, kiosk, config,
audit) [CODE][LIVE]. **A ledger whose storage is a world-readable local JSON file with no lock, no WAL, no
replication, and no restore test is a P0 architectural risk** regardless of the correctness of its postings.

## 9. Ledger Risk — the kernel audit (strongest chapter)

**Verified [LIVE] across funded batteries:** every sampled posting balances (DR=CR to the kobo); funding
(1010⇄2010), P2P (2010⇄2010, nostro untouched), NIP-out (2010 → 1010 + fee-revenue, ₦10 exact), bill-pay 4-leg
(agent-cash → biller-settlements + commissions-payable + fee-revenue, 60/40 split exact), redress (5010 → wallet)
all reconcile; rail↔journal pairing 1:1 by reference; balances recompute (A: 60,000−15,000−5,000−10 = 39,990 exact).
**Integrity properties [CODE]:** single mutator (`postTransaction`); no update/delete/void API; entries embedded in
immutable-by-convention transaction objects; currency kept per-journal, never netted across NGN/XOF in reporting.
**Gaps:** no hash chain / tamper-evidence (file edits undetectable) [CODE]; no void/reversal entry API (corrections
require new compensating journals by hand) [CODE]; subledger = major units while ledger = minor units (documented,
conversion-tested, but a latent integration trap) [CODE]; **no locking** — `walletOf` check-then-post is TOCTOU;
concurrent debits can overdraw [CODE]; multi-instance deployments hold divergent books [ARCH]. **Control question
(§4): can a user mutate a balance without accounting entries?** Through tested APIs: NO for customers/agents
(all movement journals) [LIVE]. Through privileged paths: admin APIs are unauthenticated, so anyone can freeze —
but freeze creates lifecycle state, not balance mutation; direct store-file edit bypasses everything (no control)
[CODE]. Verdict: **financially correct kernel, unprotected perimeter, unproven concurrency.**

## 10. Transaction Risk

**State machine [ARCH]:** synchronous post-or-reject (no INITIATED→…→RECONCILED lifecycle on payments); complaint/
dispute/refund lifecycles are explicit and whitelisted [LIVE]. **No arbitrary transitions possible** on money
because no transitions exist — but equally **no recovery states**: a timeout after debit returns no receipt and no
idempotent recovery handle on bank rails [CODE]. **Duplication:** same request twice on `/api/bank/v1/transfers`
= two debits (no idempotency key support, no unique refs) [CODE] — **CRITICAL**, directly violates §7's
one-effect rule. Client-retry storms, webhook retries (moot — no delivery), and provider retries all unguarded
except kiosk bill-pay [CODE]. **Concurrency:** two simultaneous withdrawals can both pass the balance check before
either posts (read-check-act across `await` points, no mutex/transaction) [CODE] — **HIGH**. **Fees/commissions:**
NIP ₦10 and bill 60/40 verified exact [LIVE]; taxes: no tax engine found [UNK]; rounding: whole-₦ inputs enforced,
kobo math in minors [CODE].

## 11. Fraud Risk

**Arsenal [ARCH]:** `RiskDecisionEngine`, `RiskSignalEngine`, `VelocityEngine`, `EntityRiskProfilingEngine`,
`FraudCaseManagementEngine`, `EarlyWarningEngine`, `Aml*` suite, `/api/core/v1/risk/*` (evaluate/decisions/holds/
cases) + `LedgerService.placeHold`. **Wiring [CODE]:** zero money-movement routes call any of them. Fraud posture
is therefore: **PRE: absent · DURING: absent · POST: available** (manual review + holds + case APIs). Covered
post-hoc in principle: velocity (engine exists), mule/circular (network-graph engine exists), agent collusion
(complaints-per-agent analytics live [LIVE]). Not covered anywhere: device binding/farms, impossible travel,
behavioral biometrics, transaction signing. "Real-Time Anomaly Telemetry 24/7" [MKT] is unwired engines + no
scheduler + no alerting sink [CODE]. A fraudster faces: format-only auth, no velocity gate, no device check, no
step-up (OTP theater) — detection only if a human queries the risk APIs afterward.

## 12. KYC/AML Technology Risk

**KYC is a profile field, not a transaction control [CODE]:** zero KYC/tier references in transfer/bank money
paths or `TransactionService`; tier-gated limits unenforced. **Verification endpoint fabricates assurance
(PGAP-1)** [LIVE]. **Agent/merchant/BDC KYC:** aggregator queue approves CAC/NIN rows statically [UI]; merchant KYB
fixture [UI]. **Sanctions/PEP:** provider is a mock-list simulation [CODE]; compliance sanctions screen shows 1,840
"screenings" unlabeled [UI]; `verify-identity` self-certifies `sanctions_pep_clean` [LIVE]. **Transaction
monitoring:** risk APIs exist, unwired (§11); compliance TM screens are fixture [UI]. **Suspicious-activity
workflows:** case engines exist [ARCH], no filing channel (UI itself notes "regulator channel not wired" [UI]).
**Record retention/expiry:** no retention/expiry logic found [UNK]. **Verdict:** the technical ability to support
AML obligations isViz: monitoring-capable APIs exist but nothing runs them; screening and verification outputs are
currently affirmatively false — worse than absent, because downstream controls trust them.

## 13. Agent Risk

Till, float visibility, bill-pay and fx execution are engine-backed and journaled [LIVE]. **Onboarding/KYC:**
aggregator-side approval rows are static [UI]; agent registry resolves live ids in CX analytics [LIVE] but
unregistered complaint agent-ids show raw (no enrollment gate proven) [LIVE]. **Float:** subledger positions live
[LIVE]; minimum-threshold/overdraft rules: "Float Overdraft Support: Eligible" is simulator copy [MKT]; no
overdraft engine found [UNK]. **Commissions:** bill-pay 60/40 enforced in-journal [LIVE]; cash-in/out splits via
`calculateAgencyCommission` + fee engine — applied in kiosk ops, not independently re-verified here [ARCH].
**Suspension:** no agent-suspend API found (account-level freeze exists, agent-level action unproven) [UNK].
**Rogue-agent blast radius:** one till's cash + kiosk op stream; no cross-agent access control server-side (auth is
format-only, agent scope = self-declared bearer + sandbox shim [CODE]) — a compromised credential is a
**network-wide** credential, not a single-till credential. Rogue aggregator: aggregator console has no live actions
at all, so blast radius is currently zero by virtue of being disconnected [UI]. Dormant-agent, collusion and
device-farm detection: none wired (§11).

## 14. POS/Device Risk

Terminal IDs are recorded on kiosk operations (`TID-NG-009182` observed live [LIVE]); "Hardware-agnostic smart POS
& Android app", "Android & Linux Smart POS Support" [MKT]. **Binding:** no device-attestation, terminal-auth,
transaction-signing, remote-lock, or session-expiry logic found [UNK]; agent scope derives from bearer only [CODE].
**Offline SMS fallback mode** [MKT]: no offline queue, no SMS-channel handler, no store-and-forward reconciler, no
offline limits/counters found in tree [CODE] — claim is unimplemented. Per §19's requirements: value/time/device
limits, counters, replay protection and conflict reconciliation for offline mode are all **absent because the mode
is absent**; do not build it without them. Lost/stolen terminal procedure: none found [UNK]. POS supply chain:
[UNK].

## 15. FX Risk

**Rate authority: none.** Three live sources disagree: site simulator 1,000 NGN ≈ 408 XOF [SITE]; customer fixture
mid 0.408, buy 0.406/sell 0.410, `source` string naming a bilateral engine that does not feed it,
`lastUpdated = now()` (fabricated freshness) [CODE]; `/api/v1/fx/corridor-rates` hardcodes 0.43/2.31 [CODE] —
**~5.4% apart with no versioning, approval, effective-time, audit or rollback.** No rate-source connector, no
stale-rate protection, no pricing authority, no spread governance [CODE]. Engine FX execution prefers live
`fxRates` with catalog fallback, unlabeled in UI (PGAP-10) [CODE]. **Treasury exposure:** currency-separated
pools [ARCH]; FX gain/loss accounting: no engine found [UNK]. **Who can change NGN/XOF:** anyone editing code or
static data; no control to attack because no control exists. Cross-rate (XOF→NGN 2.445 vs 1/0.408=2.451) is
internally inconsistent at the third decimal — immaterial financially, diagnostic culturally.

## 16. Cross-Border Risk

Claimed: "Direct Inter-Bank Bridge", "< 3 Seconds", "Bilateral Central Bank Aligned" [MKT]. **Verified:**
`/api/v1/transfers/cross-border` exists [CODE] (rate-limited [CODE]) — its settlement mechanics were not
battery-tested this assessment; all live money movement verified was NGN-only [LIVE]; XOF nodes exist as config
templates (Coris SANDBOX/CONFIGURED, never CONNECTED) [LIVE]. No correspondent/prefunding model, no settlement
windows, no failed-settlement handling, no corridor sanctions gate (see §12) found [UNK]. **"<3s settlement":**
no measurement harness exists; no latency evidence of any kind [MKT]. Verdict: the corridor is a configured
concept with an API front door; every settlement-risk question in §16 is currently answered [UNK].

## 17. Liquidity Risk

Mapped positions [LIVE][CODE]: customer float (subledgers, live), agent float (till + subledger, live), bank nostro
(providus_ng file-backed, SIMULATED mode), XOF pool (config-only), settlement accounts (chart accounts; balances
move on bill-pay/vends [LIVE]), treasury (journaled rebalancing requests [CODE]). **Missing:** committed/reserved/
intraday splits, minimum thresholds, buffers, concentration metrics, counterparty exposure, automated monitoring or
alerts [UNK]. `LiquidityStressTestEngine.runSimulation` is a scenario simulator [ARCH] — suitable for §14 modeling,
not a control. **Stress answers (analytical, [ARCH]-based):** (A) 30% simultaneous cash-out: till cash is physical
and unmodeled; digital float debits are balance-checked per-txn but TOCTOU-exposed (§10) — partial failures certain,
overdraft possible. (B) NGN≫XOF imbalance: no imbalance brake exists. (C) Bank-node failure: gatewayMode degrades to
SIMULATED honestly [LIVE] but NIP-out would still journal as successful — **ledger/truth divergence**. (D) BDC
failure: no BDC integration to fail [UI]. (E) 6h settlement delay: no settlement clock or aging exists. (F) FX shock:
no circuit breaker; static rates wouldn't move (perversely "safe"). Insolvency-prevention: balance checks only.

## 18. Settlement Risk

`SettlementEngine` is a real create→approve→execute batch machine with reserve holds [ARCH] (seeds unlabeled [CODE]).
**Usage [CODE]:** merchant/aggregator consoles show fixture batches instead (PGAP-3/4); no settlement aging, window
management, or bank-confirmation ingestion found; NIBSS session ids on fixture batches are strings, not references
to anything. Settlement outstanding/unreconciled reporting: not found [UNK]. **Failure mode:** a batch can be
executed in-engine with no proof of bank credit; conversely real bank credits have no ingestion path — settlement is
currently a **write-only assertion**. Finality, cut-off times, and partial-settlement handling: undefined [UNK].

## 19. Reconciliation Risk — P0 control, largely absent

Three-way match (app↔ledger↔bank) exists only as: (a) rail↔journal 1:1 pairing verified live [LIVE]; (b) the CX/
executive snapshots' per-engine reporting that refuses to sum across engines [LIVE]. **No reconciliation engine
runs:** no loaders for bank statements/provider totals, no match rules producing exceptions, no suspense workflow —
`ExceptionEngine` exists and holds records [ARCH] but nothing in the money path writes to it [CODE]; the only
"reconciliation" UI shows variance-0 MATCHED fixtures [UI]. Financial close (§29): daily totals/fees/commissions/
liabilities/exposures are computable from journals+subledgers (provenance-rich) but **no close procedure, checklist,
or sign-off exists** [UNK]. Unexplained differences cannot occur because differences are never computed — the
control gap, stated plainly.

## 20. Third-Party Risk

| Provider (claimed/configured) | Purpose | Evidence | Failure impact (24h loss) |
|---|---|---|---|
| Providus Bank (BANK_NODE) | NGN rails/NIP | Template SANDBOX/CONFIGURED; probes fail honestly (no outbound) [LIVE] | None today — nothing live-routes to it; SIMULATED ledgers continue |
| Coris Bank (BANK_NODE) | XOF rails | Template, no base URL [LIVE] | None — unconnected |
| NIBSS/NIP | Settlement/clearing | Template; session ids are fixture strings [CODE] | None felt (no integration) — and no settlement either |
| Flutterwave | Gateway | Template only [CODE] | None |
| Twilio/SMTP | Notifications | Templates; OTP is theater (§6) so SMS loss changes nothing [CODE] | None — notifications non-functional regardless |
| Supabase | Database | 2 route references, comment-level [CODE] | None — not in financial paths |
| Vercel | Hosting | Deployed target [SITE]; no vercel.json in repo [CODE] | Total outage; data in `/tmp`+memory does not survivecold starts/replicas — **the deployment amplifies the persistence risk** |
| KYC/identity vendors | Verification | **None integrated** (see §12) | N/A — the gap is absence |

Concentration: **the platform is its own single provider for every control that matters** (auth, KYC, screening,
rates, settlement proof). Exit strategies: moot — there is nothing to exit from. The honest 24-hour-loss answer for
every row is "no change," which is itself the finding: no live third-party dependency means no live third-party
verification of anything.

## 21. Cloud Risk

Single deployment (Vercel hobby-/pro-shape; plan/region [UNK]); no multi-region anything in code or config —
"Multi-region distributed infrastructure with automated failover" [MKT] is **false as an architecture statement**:
there is no second region, no health-checked failover, no replicated store [CODE]. Worse, serverless + in-memory
books + ephemeral `/tmp` = **correctness degrades with scale**: concurrent instances diverge (ledgers, kiosk
idempotency, audit seq). No WAF/edge policy in repo [UNK]; no secrets manager (env convention only — adequate for
stage, see §6) [CODE]; no backup of `/tmp` stores (nothing to back up *to*) [CODE]. Cloud-native posture: **C. not
cloud-resilient** — the app assumes a single long-lived server it does not have.

## 22. Data Protection Risk

**Inventory:** PII (names/phones/emails), balances, transaction history, KYC docs (fixtures), BVN/NIN (solicited by
`verify-identity`, then "verified" falsely [LIVE]), device data (minimal), location (none found). **Controls found
[CODE]:** masking utilities + masked rendering (phones, PANs, secrets) [LIVE]; ownership-scoped reads on tested BFFs
(complaint 403-probe, receipt owner rule) [LIVE]; env-only secrets [LIVE]. **Missing:** encryption at rest (plaintext
JSON) [CODE]; retention/deletion schedules [UNK]; consent records [UNK]; export audit (CSV exports are client-side,
unlogged) [CODE]; residency controls (single-region unknown + no policy) [UNK]; breach procedure [UNK]; processor
register [UNK]. **NDPR/WAEMU "strict alignment" [MKT]:** alignment is asserted; processing records, DPIA evidence,
residency enforcement and DSAR workflows are absent from the tree [CODE]. Verdict: good masking hygiene, no data-
governance program.

## 23. Availability Risk

No SLOs, no health-checked dependencies, no graceful degradation design [UNK]. Failure inventory: ledger-file
corruption (JSON.parse guarded with silent fallback to seeds — **corruption presents as fresh data** [CODE]);
single-file stores (one bad write loses one domain); memory books (restart = wipe; verified repeatedly across
batteries [LIVE]); no circuit breakers on money paths (resilience engines exist for provider fabric, untested here
[ARCH]); no load shedding, no queue (no async money path to shed) [ARCH]. Authentication anomalies/liquidity
deterioration/bank-node failure detection: none wired (§27). **Expected availability posture: best-effort; any
quantified claim would be fabrication.**

## 24. Disaster Recovery

RPO/RTO: **undefined and undefinable** — persistence is memory + ephemeral disk [CODE]. Backup frequency:
none. Backup encryption/isolation: n/a. Restore testing: never (nothing to restore). Replication: none.
Regional/DNS/app failover: none (see §21). Queue recovery: moot. **Ledger recovery: re-seed from code — i.e.,
financial records are unrecoverable after host loss.** This alone caps maturity at Prototype regardless of all
other chapters. The honest DR statement today: *"Redeploy; all balances, books, cases and audit trails restart
from seeds."*

## 25. Business Continuity

| Scenario | Detection | Containment | Continuity | Recovery | Comms | Recon |
|---|---|---|---|---|---|---|
| Database failure | n/a (no DB) | — | — | Re-seed; records lost (§24) | None defined | Impossible |
| Cloud failure | [UNK] | None | None (single deployment) | Redeploy | None | n/a |
| Bank failure | Probe FAILED recorded honestly [LIVE] | Mode flips SIMULATED [LIVE] | **Ledgers keep posting "successful" NIP-outs against a dead rail** | Re-probe | None | Manual |
| Network failure | Probe errors [LIVE] | Honest FAILED states [LIVE] | Degraded truth, no fallback rail | Re-probe | None | Manual |
| Cyber incident | No detection (§27) | No playbook | — | — | None | — |
| Fraud event | Post-hoc risk APIs only (§11) | placeHold + freeze (real, tested [LIVE]) | Per-account | Lift path tested [LIVE] | None | Journal-paired |
| Liquidity crisis | No monitor (§17) | Balance checks only | Partial | Manual funding | None | Subledger-true |
| FX shock | No feed (§15) | None (static rates) | Unaffected (also unprotected) | Code edit | None | n/a |
| Regulatory suspension | No kill-switch found | Per-account freeze only | — | — | None | — |
| Key-employee loss | [UNK] | Docs 01–09 are unusually good continuity artifacts [CODE] | — | — | — | — |
| Third-party failure | Probes [LIVE] | Honest modes [LIVE] | Unaffected (nothing integrated) | Reconfigure | None | n/a |

Playbooks, comms templates, and rehearsal evidence: none found [UNK].

## 26. Regulatory Technology Readiness

Separating licensing (legal, out of scope) from **technical control readiness**:

| Obligation | Technical readiness |
|---|---|
| KYC (perform + enforce) | Perform: fabricated (§12). Enforce: absent. **Not ready** |
| AML monitoring/screening | Engines + APIs exist, unwired; screening simulated. **Not ready** |
| Transaction monitoring | Same. **Not ready** |
| Record retention | No retention engine; records ephemeral (§24). **Not ready** |
| Auditability | Strong *within a session*: journals, dual-control audit, complaint histories [LIVE]. Across restarts: lost. **Session-ready only** |
| Consumer protection / complaints | Best-in-tree: full instrumented loop with redress + CSAT + SLA truth [LIVE]. **Ready pattern** |
| Limits | Defined in places, unenforced in money paths. **Not ready** |
| Suspicious-activity monitoring | Case mgmt exists, no detection feed, no filing channel. **Not ready** |
| Regulatory reporting | Report *definitions* fixture in compliance portal [UI]; no generators over live data. **Not ready** |
| Data protection | Masking yes, program no (§22). **Partial** |
| Access control / SoD | No server RBAC; maker≠checker unenforced. **Not ready** |
| Reconciliation | Pairing yes, program no (§19). **Not ready** |

A regulator asking "show me" gets excellent answers for complaints and session-scoped accounting, and failures
everywhere identity, screening, retention, and access control are concerned.

## 27. Technical Debt

Ranked by impact, financially-weighted: (1) **Persistence debt** (memory+`/tmp` as system of record) — financial +
operational, existential; (2) **AuthN/Z debt** (format-only auth, no sessions/RBAC/registry) — security, critical;
(3) **Verification debt** (KYC/OTP theater) — regulatory + fraud, critical; (4) **Duplicated portals**
(customer≡customer; gateway/integration folders) — operational; (5) **Fixture debt** (~6,000 lines across 8
services; 92 static pages) — operational + decision risk; (6) **Unit-boundary debt** (major-subledger/minor-ledger)
— financial, currently managed by convention + labels; (7) **Unlabeled seeds** (settlement batches, intelligence
profiles) — decision risk; (8) **Client-side financial preview** (FX/fee estimates) — low while server re-derives;
(9) **Missing tests** (§37 of brief: zero financial-logic coverage) — spans all four impact classes; (10) Dead code
(orphaned agent service, unread demo flag) — hygiene. Coupling: engines are clean; debt concentrates at the
trust boundary (routes) and the storage floor.

## 28. Scalability

Bottleneck analysis by order of magnitude: **1k–10k customers:** single-instance memory books + JSON file
read-modify-write per request (whole-file parse on hydrate paths) — adequate, latency unmeasured [UNK].
**100k:** file-lock contention (no locking — corruption, not just slowness), audit arrays capped at 400 (silent
history loss [CODE]), in-memory filter scans. **1M+:** impossible without re-platforming persistence; analytics/
exports share the request path (no OLTP/OLAP split — §34 of brief: BI *is* the transactional read path) [ARCH].
**Agents 1k→50k:** kiosk store is single-file + single-till constants (`AGENT_PORTAL_ENGINE_AGENT_ID`) — the till
is architecturally one till [CODE]. Notifications: no queue [CODE]. **Scale verdict:** vertical single-server to
low-thousands of users; horizontal scale is a rewrite of the storage floor, not an optimization.

## 29. Observability

Detectable today: bank-node probe failures (recorded + surfaced [LIVE]); automation decisions (audited [LIVE]);
complaint SLA breach (computed [LIVE]); journal/rail pairing breaks (derivable, no alerter). **Not detectable:**
failed/duplicated transactions (no Ethicaladedger), ledger drift (no hash), auth anomalies (no login telemetry
beyond in-memory limiter), fraud (unwired), suspicious admin actions (no actor identity), liquidity deterioration
(no monitor), webhook failures (no delivery). Logs: application `console` + file audit trails [CODE]. Metrics/
traces/SIEM: none found [UNK]. Fraud telemetry: engines without feed or sink (§11). **MTTD for every §27-listed
event except probes: unbounded.**

## 30. Control Effectiveness

| Control family | Design | Implementation | Operation | Effectiveness |
|---|---|---|---|---|
| Double-entry integrity | Strong | Correct (verified) | Unprotected perimeter | **Partially effective** |
| Balance derivation | Strong | Correct per-process | Wipes on restart | **Ineffective across time** |
| Authorization | Weak (format-only) | As designed (badly) | No monitoring | **Ineffective** |
| Identity verification | Fraudulent outputs | "Works" (always yes) | Trusted downstream | **Harmful (worse than absent)** |
| Dual control / SoD | Good (record+execute) | Real for wallets | Maker≠checker unenforced; unwired actions | **Partially effective** |
| Audit trail | Good | File-backed, capped | Lost on redeploy | **Session-effective** |
| Reconciliation | Absent | n/a | Fixture UI | **Ineffective** |
| Fraud (pre/during) | Engines exist | Unwired | N/A | **Ineffective** |
| Fraud (post) | APIs + holds + freeze | Verified live | Manual | **Partially effective** |
| Change/config | Good (hub, probes, masked secrets) | Verified live | No approval gate on PRODUCTION promotion | **Partially effective** |
| Complaints/redress | Strong | Verified end-to-end | Working loop | **Effective (in-session)** |

No single control is trusted alone in the *design* (defense-in-depth is architecturally legible); in *operation*,
most layers are unwired, un persist ed, or unauthenticated — depth on paper, single-ply in production.

## 31. Risk Register

Scale: P/I 1–5, score P×I (1–4 LOW, 5–9 MODERATE, 10–14 HIGH, 15–19 VERY HIGH, 20–25 CRITICAL).
Exposures: F financial · C customer · R regulatory · O operational. Owners: E engineering · P product · F fraud/risk ·
C compliance · O ops · X exec. Target dates relative to report date (D+days).

| ID | Title | Cat | P | I | Score | Existing control (effectiveness) | Recommendation | Exposures | Owner | Pri | Target |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R-01 | Format-only API auth (self-minted bearers, full scopes) | Cyber/Auth | 5 | 5 | **25** | Prefix check (ineffective) | Credential registry + per-key scopes + revocation; env from key record | F: unbounded movement · C: takeover · R: license-threatening | E | P0 | D+10 |
| R-02 | Unauthenticated admin APIs incl. account freeze | Cyber/AuthZ | 5 | 5 | **25** | None | Bearer+role guard on all `/api/admin/*`; actor attribution in audit | F: freeze/extortion · O: unattributed ops | E | P0 | D+7 |
| R-03 | KYC always-verifies + self-certified sanctions-clean | Reg/Fraud | 5 | 5 | **25** | None (harmful) | Real verification source or honest UNVERIFIED; remove EXACT_MATCH default; mark EXPERIMENTAL now | R: criminal facilitation · F: fraud onboarding | E,C | P0 | D+10 |
| R-04 | OTP accepts any 6-digit code; no server sessions | Cyber/Auth | 5 | 4 | **20** | Length check (ineffective) | Real OTP (hashed, TTL, attempts) or remove MFA claim; server sessions + invalidation | C: takeover · R: false assurance | E | P0 | D+10 |
| R-05 | Financial state in memory + `/tmp` JSON; unrecoverable | Resilience | 5 | 5 | **25** | File writes (ineffective as durability) | Managed Postgres + migrations + PITR + restore test; engines behind repositories | F: total record loss · O: restart wipe · R: retention fail | E,O | P0 | D+30 |
| R-06 | Double-submit = double debit (no idempotency/unique refs on rails) | Txn | 4 | 5 | **20** | Kiosk-only idempotency (partial) | Idempotency-Key support + unique refs on all money POSTs; safe retry contract | F: duplicate debits · C: overcharge | E | P0 | D+14 |
| R-07 | Race overdraw (check-then-post, no lock/txn) | Txn | 4 | 5 | **20** | Balance check (TOCTOU) | Atomic debit (DB txn / conditional write); serialized per-account queue | F: overdraft/ledger drift | E | P0 | D+30 |
| R-08 | No server-side RBAC; portals separated client-side only | Cyber/AuthZ | 5 | 4 | **20** | UI routing (ineffective) | Role middleware + scope matrix (§10 of brief) on every route | C: cross-tenant reads · O: privilege abuse | E | P0 | D+21 |
| R-09 | Fraud engines unwired (no pre/during-transaction control) | Fraud | 5 | 4 | **20** | Post-hoc APIs + holds (partial) | Inline evaluate→decision→hold in money paths; velocity + device gates first | F: unchecked fraud · C: victim loss | F,E | P0 | D+30 |
| R-10 | Ledger tamper-evident claim false (editable JSON, no hash chain) | Ledger | 3 | 5 | **15** | Append-only API convention (weak) | Hash-chained journal + WORM/reflective backup + periodic attestation | F: silent alteration · R: audit fail | E | P1 | D+45 |
| R-11 | No reconciliation program (breaks never computed) | Recon | 5 | 4 | **20** | Rail↔journal pairing (partial) | Statement/provider loaders + match rules → ExceptionEngine → worked queue + close checklist | F: hidden leakage · O: no close | O,E | P1 | D+45 |
| R-12 | Webhooks marked PUBLISHED, never delivered | Integration | 5 | 3 | **15** | Outbox table (stub worker) | Real dispatcher (sign+retry+DLQ) or label configured-not-firing everywhere | O: integrator breakage · C: missed events | E | P1 | D+30 |
| R-13 | FX: 3 disagreeing static sources, no authority/versioning | FX | 5 | 4 | **20** | None | Single rate authority + approval + versioning + stale protection; reconcile to one number now | F: mispricing/arbitrage · C: wrong quotes | P,E | P1 | D+30 |
| R-14 | NIP-out journals "success" against dead rails (ledger/truth split) | Settlement | 4 | 4 | **16** | Honest SIMULATED mode label (partial) | Rail-gated posting (no receipt → no success entry) + settlement aging + bank-credit ingestion | F: phantom credits · O: false success | E | P1 | D+45 |
| R-15 | KYC/tier/limits unenforced in money paths | Controls | 5 | 3 | **15** | Tier fields exist (dormant) | Enforce tier limits + KYC-gating pre-posting; limit-change audit | R: limit breach · F: structuring | E,C | P1 | D+30 |
| R-16 | Maker≠checker unenforced; privileged actions unattributed | Gov | 4 | 4 | **16** | Dual-control record+execute (partial) | Enforce maker≠checker; actor from auth context on every privileged write | O: SoD breach · R: control fail | E | P1 | D+21 |
| R-17 | Single-region serverless + divergent in-memory books | Cloud | 4 | 4 | **16** | None | Durable store first (R-05), then stateless app tier; kill multi-region claim until true | O: outage + divergence | O,E | P1 | D+60 |
| R-18 | Zero financial-logic test coverage | Eng | 5 | 3 | **15** | Manual live batteries (partial, unrepeatable) | Ledger/txn/idempotency/concurrency/authz suites in CI; batteries codified | O: regression · F: silent breakage | E | P1 | D+45 |
| R-19 | Merchant/aggregator consoles render static money as truth | Decision | 5 | 3 | **15** | Nothing (unlabeled) | Wire to engines (settlement/disputes/exceptions) or withhold+label like admin BDC/merchants | O: decisions on fiction · R: misreporting | P,E | P2 | D+60 |
| R-20 | Secrets at rest plaintext; PIN hash unsalted-stretched (single SHA-256) | DataSec | 3 | 4 | **12** | Env-only + masking (partial) | Managed secrets + AES-256-GCM at rest; argon2/bcrypt PINs; rotation runbook | C: PII/balance leak · R: NDPR | E,O | P2 | D+60 |

Status: all OPEN. Inherent = residual for P0s (no effective control exists).

## 32. Risk Heatmap (P × I)

| Domain | P | I | Score | Band |
|---|---|---|---|---|
| Authentication | 5 | 5 | 25 | CRITICAL |
| Authorization | 5 | 4 | 20 | CRITICAL |
| KYC | 5 | 5 | 25 | CRITICAL |
| Ledger (durability/tamper) | 5 | 5 | 25 | CRITICAL |
| Transaction (idempotency/concurrency) | 4 | 5 | 20 | CRITICAL |
| Database/persistence | 5 | 5 | 25 | CRITICAL |
| Disaster recovery | 5 | 5 | 25 | CRITICAL |
| Fraud (pre/during) | 5 | 4 | 20 | CRITICAL |
| Reconciliation | 5 | 4 | 20 | CRITICAL |
| FX | 5 | 4 | 20 | CRITICAL |
| AML | 5 | 4 | 20 | CRITICAL |
| Settlement | 4 | 4 | 16 | VERY HIGH |
| Liquidity (monitoring) | 4 | 4 | 16 | VERY HIGH |
| Ledger (correctness) | 2 | 5 | 10 | HIGH |
| API (docs/state) | 4 | 3 | 12 | HIGH |
| Third-party | 3 | 3 | 9 | MODERATE (nothing integrated) |
| Cloud | 4 | 4 | 16 | VERY HIGH |
| Availability | 4 | 4 | 16 | VERY HIGH |
| Privacy | 3 | 4 | 12 | HIGH |
| Regulatory technology | 5 | 4 | 20 | CRITICAL |
| Operational controls | 4 | 4 | 16 | VERY HIGH |

Seven CRITICAL bands. Note the deliberate split: ledger *correctness* is HIGH only (the kernel is good);
ledger *durability* is CRITICAL (its floor is `/tmp`).

## 33. Top 10 Critical Risks (systemic)

1. **Ephemeral system of record (R-05)** — host loss wipes balances, books, cases, audit. Nothing else matters until fixed.
2. **Format-only auth (R-01)** — the entire API estate is effectively public with full scopes.
3. **Always-yes KYC + fake sanctions clearance (R-03)** — criminal-enabling assurance, trusted downstream.
4. **Unauthenticated admin APIs (R-02)** — freeze/compensate/configure from anywhere, unattributed.
5. **OTP theater + no sessions (R-04)** — account-takeover triviality behind an MFA claim.
6. **Double-debit + race overdraw (R-06/R-07)** — correctness failures at volume, no recovery handles.
7. **No server RBAC (R-08)** — cross-tenant exposure by design.
8. **Unwired fraud controls (R-09)** — no pre-transaction gate of any kind.
9. **No reconciliation (R-11)** — leakage is uncomputable, close is impossible.
10. **Disagreeing static FX (R-13)** — mispricing/arbitrage with no authority to appeal to.

## 34. Top 10 Quick Wins (low effort, material reduction)

1. Bearer+role guard on `/api/admin/*` (hours; kills R-02's exploitability).
2. Mark `verify-identity` EXPERIMENTAL + return UNVERIFIED default (hours; stops active harm from R-03).
3. Reject non-whitelisted OTP server-side / remove MFA claim (hours–days; R-04).
4. `DemoStrip` on the 18 unlabeled compliance pages + surface `PORTAL_DEMO_MODE` (hours; PGAP-5).
5. Single FX number + COMING_SOON on 404 catalog endpoints (hours; R-13/PGAP-7).
6. Enforce maker≠checker + actor-from-context (days; R-16).
7. Idempotency-Key on bank transfer POSTs + unique refs (days; R-06).
8. Per-account async mutex around check-then-post (days; interim for R-07 until DB txns).
9. Label outbox/webhooks configured-not-firing (hours; R-12) — or wire dispatcher (weeks).
10. `isSeed` on settlement seeds + delete orphaned `agentDataService` (hours; decision hygiene).

## 35. Target Architecture

Channels (Customer/Agent/Merchant/Aggregator/BDC/Developer/Admin) → **API Gateway** (authN, rate-limit, idempotency
keys, request signing) → **Auth/IAM/RBAC** (credential registry, sessions, scopes, SoD) → **Risk/Fraud engine
(inline)** (velocity, device, KYC-tier, limits, sanctions) → **Payment Orchestrator** (state machine with recovery
handles) → **Double-entry ledger (durable, hash-chained)** → **Reconciliation/Settlement** (match rules, exceptions,
bank ingestion) → **Bank/BDC/Network adapters** (receipt-gated posting) → **Treasury/Liquidity** (thresholds, buffers,
alerts) → **Regulatory/BI/MIS** (warehouse off the OLTP path). Each layer: authority (owns its decision), auditability
(append-only trail), failure mode (fail-closed toward money safety), security boundary (authenticated, scoped calls
only). The current engines slot into this map — the missing pieces are the gateway, IAM, inline risk, durable store,
recon loop, and warehouse, not new product logic.

## 36. Target Controls (defense in depth, 10 layers)

L1 Identity (verified KYC, real OTP, sessions) → L2 Authentication (credentials, MFA, rotation) → L3 Authorization
(RBAC/scopes, SoD) → L4 Transaction risk (inline fraud + sanctions) → L5 Financial limits (tier/velocity/liquidity
gates) → L6 Ledger integrity (hash chain, atomic post, no privileged mutation) → L7 Reconciliation (daily match,
exceptions, suspense aging) → L8 Fraud monitoring (alerts, holds, cases) → L9 Audit (immutable, attributed,
retained) → L10 Regulatory monitoring (filing-ready extracts, retention proofs). Rule: money moves only if L1–L6
pass; L7–L10 detect what prevention missed. Current state: L6-posting correct but unprotected; L9 session-strong;
L1–L5/L7/L8/L10 absent or unwired.

## 37. 30/60/90-Day Remediation

**Days 0–30 — stop the bleeding; earn controlled-launch candidacy for the NGN slice.**
Auth registry + admin guards + sessions + real OTP (R-01/02/04/08); KYC honest-default + EXPERIMENTAL marking (R-03);
Postgres migration for ledger/subledger/bank/kiosk/config/audit + PITR + restore drill (R-05); idempotency keys +
unique refs (R-06); per-account mutex interim (R-07); maker≠checker + actor attribution (R-16); single FX number
(R-13); DemoStrip completion (PGAP-5); ledger/txn/authz test suites in CI (R-18). **Exit:** P0s closed, restore
demonstrated, NGN customer/agent money re-batteried live.

**Days 31–60 — become reconcilable and fraud-aware.** Inline risk (velocity/device/KYC-tier/limits) in money paths
(R-09/R-15); hash-chained journal + WORM backup (R-10); recon loaders + match rules → ExceptionEngine + worked queue
+ close checklist (R-11); rail-gated posting + settlement aging + bank ingestion (R-14); real webhook dispatcher +
DLQ (R-12); merchant/aggregator engine wiring or withhold-labeling (R-19); liquidity thresholds + alerts + BCP
playbooks (R-17, §25). **Exit:** first attested financial close; fraud gates measured (precision/recall on review
queue).

**Days 61–90 — become scalable and regulator-legible.** Stateless app tier + read replicas + OLTP/OLAP split (R-17,
§28); treasury automation with approval gates (replace "Automated T+0" claim with the real thing); AES-256-GCM +
argon2 + rotation (R-20); secrets manager; SIEM + alerting + MTTD targets (§29); retention/DSAR/residency program
(§22); regulatory reporting generators over live data (§26); rate authority + versioning + circuit breakers (R-13);
chaos/DR rehearsal (region loss, bank loss, key compromise). **Exit:** external audit re-grade; go/no-go for
institutional scale.

## 38. Production Go/No-Go Assessment

**Readiness gate (brief §44) — answered with evidence:**

| Gate question | Answer |
|---|---|
| Balances trusted? | In-session yes [LIVE]; across restarts no (§24). **NO** |
| Transactions reconciled? | Paired, not reconciled (§19). **NO** |
| Duplicates prevented? | Kiosk/account-open yes; rails no (§10). **NO** |
| Unauthorized roles blocked? | No server RBAC (§6). **NO** |
| Ledger entries protected? | By convention only; file editable (§9). **NO** |
| Fraud detected? | Post-hoc only (§11). **PARTIAL** |
| Liquidity monitored? | Positions yes, monitoring no (§17). **PARTIAL** |
| Bank failures handled? | Honestly labeled, still journals success (§25). **NO** |
| Recover from DB failure? | No DB; records unrecoverable (§24). **NO** |
| Adjustments audited? | Dual-control audit yes, in-session (§30). **PARTIAL** |
| Privileged actions attributed? | Checker named, maker unenforced, admin APIs anonymous. **PARTIAL** |
| Complaints investigated? | Yes — best loop in tree [LIVE]. **YES** |
| Regulators receive reliable data? | Complaints yes; identity/screening/retention no (§26). **NO** |
| Operate during partial failure? | No (§§23–25). **NO** |

**Decision: NO-GO for production; CONDITIONAL path to D (controlled launch, NGN slice) via days 0–30 exit criteria.**
NO-GO triggers present (§45): ledger durability unverified (§24), financial authorization weak/absent (§6),
reconciliation absent (§19), privileged controls inadequate (§6/R-16), funds not independently reconcilable across
time (§§19/24), critical SPOFs unmitigated (single deployment + ephemeral stores), idempotency absent on rails
(§10), recovery undemonstrable (§24). Secrets handling is the one §45 trigger that does **not** fire (env-only
verified [LIVE]).

**Maturity: B. Prototype** (ledger core: production-grade mechanics; everything around it: prototype).
Target after 90 days with exits met: **D, approaching C for the NGN slice**; E/F require the corridor, BDC, and
scale programs beyond this plan.

**Final-principle answer:** KoriePay today is financially *correct* in-session but not secure, reconcilable,
auditable-across-time, resilient, scalable, fraud-resistant, liquidity-aware, regulatory-ready, operationally
controlled, or institutionally trustworthy. The remediation above is designed to make each adjective true in that
order — correctness first (done), then security and durability (days 0–30), then reconcilability and fraud
resistance (31–60), then resilience, scale and regulatory readiness (61–90). Re-grade at each exit; do not skip
the order — a scalable system with format-only auth is just a faster way to lose money.
