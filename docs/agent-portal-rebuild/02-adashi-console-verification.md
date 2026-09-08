# Agent Adashi console — bound pass & verification evidence

Date: 2026-09-08 · Branch: `feature/compliance-portal-demo-rebuild`
Scope: **D-A4** agent Adashi operator console (`/agent/adashi`) — privacy, auth and engine wiring, no client fiction.

---

## 1. What changed

| Surface | Before | After |
|---|---|---|
| `src/app/agent/adashi/page.tsx` | Legacy dark page; `alert()` handlers; synthetic inline member ids; no auth-shaped calls; hard-coded console rows | Light client page; every read goes through `GET /api/agent/adashi`; every mutation through `POST /api/agent/adashi` action dispatch; engine truth everywhere; member phone/email masked; account ids shown as fragments |
| `src/app/api/agent/adashi/route.ts` | — (new) | Scoped BFF: `withAgentAuth` (`payments:read` / `payments:write`), operator alias resolved **server-side**, canonical Adashi engine calls only |

### Engine surfaces wired (canonical, unchanged engines)
- `AdashiGroupLifecycleEngine.createGroup` → invites state
- `AdashiMembershipEngine.inviteMember` → `INVITED`
- `AdashiMembershipEngine.captureConsent` → `CONSENT_ACCEPTED` + mandate flag
- `AdashiGroupLifecycleEngine.lockMembership` (quorum = target members)
- `AdashiRotationAllocationEngine.generateRotation` (HMAC-SHA256 deterministic order, fairness score)
- `AdashiGroupLifecycleEngine.startGroup` → cycle + obligations
- `AdashiCycleObligationEngine.processContributionPayment` (`AGENT_COLLECTION`, double-entry journal, idempotency key)
- `AdashiPayoutEngine.initiatePayout` (maker-checker flags payouts ≥ product threshold)

### Privacy & identity posture
- Console lists **only** marketplace circles where `creatorId === "usr-agent-001"` **or** `assignedAgentId === "usr-agent-001"`. XOF/Niger groups and other agents' circles are not readable or operable.
- Member phone numbers masked (`0801 ••• 234`), emails masked (`j••••@…`), escrow vault/destination accounts shown as fragments.
- All POST mutations are attributed server-side to the operator alias; the browser can never choose its own actor identity.
- Member consent/mandate state shown as recorded by the operator; audit events carry the engine's own `MEMBER_CONSENT_*` semantics.

---

## 2. Verification run (live server, prod build, seeded `/tmp` store)

Full lifecycle executed through `POST /api/agent/adashi` with the sandbox bearer credential.

| Step | Action | Engine result |
|---|---|---|
| Create | `Monthly Executive Builder (NGN)`, target 12 | `ADA-NG-210663` → `INVITING_MEMBERS`, escrow `ESCROW_VAULT_NGN_01`, pool ₦600,000 (`12 × ₦50,000`) |
| Invite ×12 | member name/phone/KYC tier | all `INVITED`, member ids `mbr-…` |
| Consent ×12 | `captureConsent` | all `CONSENT_ACCEPTED`, mandate authorized |
| Lock | `lockMembership` | `MEMBERSHIP_LOCKED`, `currentMembersCount: 12` |
| Rotation | `generateRotation` | `HMAC_SHA256_DETERMINISTIC`, fairness **99.8**, `PUBLISHED`, 12 slots; slot 1 = Member 07 |
| Start | `startGroup` | `ACTIVE_IN_PROGRESS`; cycle 1 `CONTRIBUTION_OPEN`, beneficiary = slot-1 member (rotation ⇄ cycle linkage), due 2026-10-08, expected ₦600,000, 12 obligations @ ₦50,000 |
| Collect | `processContributionPayment` (key `agent-collect-obl-…`) | obligation → `PAID`, method `AGENT_COLLECTION`, ledger journal `ltx_1788828210818_zhf6i` |
| Replay (same key) | 2nd collect attempt | **HTTP 400 `ALREADY_PAID`** — no double posting |
| Payout | `initiatePayout` | `PENDING_AUTHORIZATION`, gross ₦600,000, fee ₦9,000, agent commission ₦3,000, net ₦588,000, `requiresMakerChecker: true` (≥ ₦500,000 threshold); cycle 1 advanced to `PAYOUT_PENDING_APPROVAL` |

### Journal posted for the collected contribution (ledger store, COMMITTED)
```
ltx_1788828210818_zhf6i · KP-ADA-agent-collect-obl-1788828210797--359
DEBIT  acc_asset_agent_cash_ngn   5,000,000  Agent cash collection … (to be remitted)
CREDIT acc_liab_adashi_escrow_ngn 5,000,000  Escrow pool — … cycle 1
```
Minor units: ₦50,000 = 5,000,000. Double-entry balanced, single COMMITTED journal.

### Console GET shape (after the run)
- Scoped console groups: 2 (Balogun `ACTIVE_IN_PROGRESS`, Kano `INVITING_MEMBERS`) — XOF/third-agent groups absent.
- Stats reflect scoped groups only; counts derive from store arrays (`openCollections`, `paidThisCycle` computed server-side at request time).

---

## 3. Honesty notes (non-goals of this pass)
- New member invitations create **demo members** (`cust-agent-ada-*` operator-entered ids); they are not yet linked to kiosk customer registry records. Linkage to real registry customers is a listed follow-up before any member-level traceability claim.
- XOF (CFA) circles and the Niamey/Lagos-2 marketplace agents are out of console scope by design.
- Runtime store is seed-backed and ephemeral (`/tmp`, overridable via env) — snapshot figures above apply to the verification run, not to production data.
- Locale copy (`ha`/`fr`) for the console copy is deferred to the post-stabilization locale pass.
