# KORIEPAY CUSTOMER PORTAL — BACKEND CONNECTION & SECURITY AUDIT
### Phase 1 (Architecture) · Phase 2 (Frontend↔Backend Map) · Phase 3 (Data Relationships)

**Audit basis:** traced actual repository code and SQL migrations. Findings below are read from source, not assumed.

---

## 1. Architecture as it actually exists

| Component | Reality |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Backend runtime | Next.js route handlers (`src/app/api/**/route.ts`) |
| Database | **Supabase/Postgres** (schema + migrations in `supabase/migrations/`) |
| ORM / access | `src/lib/supabase/client.ts` & `server.ts` (Supabase JS) |
| Auth (API) | `src/lib/security/authMiddleware.ts` — **currently a structural/format check only** |
| Auth (UI) | `src/components/auth/AuthContext` |
| Ledger | **Real double-entry ledger** (`ledger_accounts`, `ledger_transactions`, `ledger_entries`) |
| Providers/webhooks/outbox | Migrations exist; customer portal does **not** use them |
| Reconciliation / RLS / audit | Migrations exist (`20260903000006`, `...07`) |
| Customer portal UI | **100% frontend-mocked** (constants + local state) |

### Config surface
```
supabase/migrations/
  20260903000001_core_identity_and_tenancy.sql
  20260903000002_customers_and_wallets.sql
  20260903000003_double_entry_ledger.sql   ← double-entry, BIGINT minor units, verify_double_entry_balance(), prohibit-mutation trigger
  20260903000004_transactions_and_idempotency.sql
  20260903000005_providers_webhooks_outbox.sql
  20260903000006_reconciliation_audit_compliance.sql
  20260903000007_row_level_security.sql
  20260903000008_core_financial_engine.sql
```

---

## 2. CRITICAL FINDING — the customer banking flow is not connected to the backend

The core customer banking path is **simulated entirely in the browser**. `CustomerContext.tsx` imports hardcoded constants from `src/services/customerDataService.ts`:

- `CURRENT_CUSTOMER`, `CUSTOMER_WALLETS`, `CUSTOMER_TRANSACTIONS`, `CUSTOMER_BENEFICIARIES`, `CUSTOMER_CARDS`, `CUSTOMER_SUPPORT_TICKETS`
- `executeTransfer()` / `executeBillPayment()` **mutate local React state** (`setWallets`, `setTransactions`) with fabricated references, fees, timelines and statuses.
- The **only** customer page that calls the backend is `/customer/adashi` (`fetch('/api/v1/adashi/*')`).

**Result:** the "transaction lifecycle," "ledger," "idempotency," "provider/webhook," and "reconciliation" layers the schema describes are **not exercised by the customer portal**. The frontend displays mock balances/transactions/statuses as if authoritative — this is precisely the "frontend success ≠ financial success" anti-pattern the brief forbids.

### Backend routes that DO exist but are inconsistent
- `/api/customer/360` → reads **in-memory singleton engines** (`CustomerLifecycleEngine`, `AccountLifecycleEngine`, `PaymentSwitchEngine`, …), not the DB ledger.
- `/api/v1/wallets/[id]/balance` → uses real `authenticateApiRequest` but returns a **hardcoded fabricated balance** (`balance: 85000000`, `formatted_available: '₦845,000.00'`) — a fake financial value.
- `/api/v1/transfers/cross-border` → exists (see below) but no portal path exercises it.

---

## 3. NGN/XOF integrity

- Data model separates `CustomerWallet.currency` ("NGN" | "XOF" | "USD"); the ledger uses `currency` and stores **minor-unit `BIGINT`** — good.
- **Gap:** the portal's `formatMoney`/balance math runs on JS `number`; the authoritative balance must come from the ledger, not the client.
- **Gap:** cross-border `FX_RATES` are mocks in `customerDataService.ts`. The send flow uses `fxQuote.midRate` client-side to compute "recipient receives" — this is **not** authoritative. It is clearly labelled illustrative, but a connected build must source rate + fee from the backend contract.

---

## 4. Transaction lifecycle / state model

Real schema (`ledger_transactions.status`): `PENDING | COMMITTED | REVERSED | DISPUTED`.
Portal `CustomerTransactionStatus`: `SUCCESSFUL | PENDING | PROCESSING | FAILED | REVERSED | CANCELLED`.
→ The frontend label set does **not** map 1:1 to the authoritative ledger states; `PROCESSING`, `CANCELLED`, `FAILED` are not in the ledger enum, and `COMMITTED`/`DISPUTED` are not in the UI enum. This must be reconciled against the real backend states.

---

## 5. Authentication & authorization reality

- `authMiddleware.authenticateApiRequest` validates **token format** (`kp_live_` / `kp_test_` / `pk_*`) and grants **default mock scopes** for any well-formed key. Code comment: *"In production, validate token against Supabase / Key Vault."* → **not yet wired to Supabase.**
- Customer route `/api/customer/360` reads `?id=<customerId>` from the query string and returns that customer/accounts — **no ownership check**. This is a textbook **IDOR / broken-object-level-authorization** risk (customer A can request customer B's id).
- `/api/v1/wallets/[id]/balance` does authenticate + scope-check, so it is safer, but returns fabricated data.

---

## 6. Idempotency / concurrency

- Migration `20260903000004_transactions_and_idempotency.sql` exists and `authMiddleware` reads an `Idempotency-Key` header — **the schema/middleware support it, but the customer transfer path never sends one**, and `executeTransfer` has no server-side idempotency enforcement (only a client-side `disabled` flag).
- No row-locking/atomic balance update is wired into the portal transfer path. A double-submit would pass the client check and create two in-memory transactions.

---

## 7. Receipts

- Receipts currently render from `TransactionReceiptModal` (client component) using the same in-memory transaction object. No receipt data contract, no image/PDF generation, no secure receipt API, no authenticated file access. No receipt DB/endpoint.

---

## 8. Money representation

- Schema: ledger uses `BIGINT` minor units (correct).
- Portal: `formatMoney` / amounts use JS `number`/float; **client-side** arithmetic must never be the accounting source of truth.

---

## 9. Security posture summary

| Concern | Status |
|---|---|
| Server-side authorization (ownership) | ❌ No ownership check on `/api/customer/360` |
| Auth validated against Supabase | ❌ Format-only mock |
| Idempotency enforcement | ⚠️ Schema exists; portal doesn't use it |
| Concurrency / row locking | ⚠️ Schema-ready; portal path is client-only |
| Duplicate transaction prevention | ❌ Not exercised |
| Provider/webhook authenticity | ⚠️ Migrations exist; no customer flow |
| Ledger/balance consistency | ⚠️ Real ledger; portal bypasses it |
| Anti-IDOR | ❌ (`?id=` on /api/customer/360) |
| Secrets in client bundle | ⚠️ Check `.env*` gating + client env usage (audit next) |
| Receipt file enumeration | ❌ No receipt files/endpoints yet |

---

## 10. What this means for the work

The bolded conclusion the brief drives at is **true**: the customer portal is *not* yet "one connected financial system." The **schema is genuinely good** (double-entry ledger, minor-unit BIGINT, idempotency, RLS, providers/outbox, reconciliation), but the **customer portal is a disconnected mock UI** and a few API routes expose fake or unowned data.

### Honest scope boundary
`Double-entry ledger`, `row-locking`, `provider/webhook processing`, `reconciliation runs`, and `structured logs` need a **running Supabase database + provider config**. This sandbox has **no running DB and no banking provider**, so those cannot be *built-and-verified* end-to-end here, and I will not fabricate "SUCCESSFUL" provider/ledger outcomes. What **is** achievable and verifiable now:

- A typed **receipt data contract** + **premium receipt UI** + **client-side shareable PNG** (uses existing authoritative transaction fields; no fake provider data).
- **Hardening** the parts I can prove: adding an ownership/authorization guard to `/api/customer/360` (real request + response shaping), and a truthful `wallet balance` response path that does **not** invent numbers.
- **Documenting** the connect-the-portal-to-ledger plan so the live-DB work is scoped.

*(Full Phase 6–13 implementation — idempotency, concurrency, provider/webhook, reconciliation — requires the live environment and is tracked separately.)*
