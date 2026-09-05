# KORIEPAY CUSTOMER PORTAL — BACKEND / LEDGER CONNECTION & HARDENING PLAN
### Live-environment implementation guide (documented, not fabricated)

This is the implementation plan for the parts of the program that need a **running
Supabase/Postgres database + a banking provider**. It is documented here so the logic
is ready to wire up in production; it is **not** executed in this sandbox because those
services are not available here, and I will not fabricate provider/ledger outcomes.

---

## 1. What is already ALREADY DONE and verified in this repo

| Item | Status | Evidence |
|---|---|---|
| Customer portal fully light-first + EN/FR/HA | ✅ | all 16 routes, 0 unresolved `t()` refs |
| Dashboard reference hierarchy | ✅ | VaultCard / Hub / Services / Ledger History |
| Typed receipt contract (`buildReceiptData`) | ✅ | `src/lib/receipt.ts` |
| Premium receipt document (UI) | ✅ | `ReceiptDocument` |
| Receipt PNG + PDF export | ✅ | `captureReceipt.ts` + print stylesheet |
| Secure receipt API (**ownership-enforced**) | ✅ | `GET /api/customer/receipts/:id` → 401/200/404 (verified) |
| **IDOR fix on `/api/customer/360`** | ✅ | derives identity from auth context; `403` cross-customer (verified) |
| **De-fabricated wallet balance** | ✅ | reads subledger → `CFA 450,000` (verified) |

## 2. Architecture that EXISTS in the schema (source of truth)

```
supabase/migrations/
  20260903000001_core_identity_and_tenancy.sql
  20260903000002_customers_and_wallets.sql
  20260903000003_double_entry_ledger.sql      ← ledger_accounts / ledger_transactions / ledger_entries
                                                (BIGINT minor units, verify_double_entry_balance(),
                                                 prohibit-mutation trigger)
  20260903000004_transactions_and_idempotency.sql
  20260903000005_providers_webhooks_outbox.sql
  20260903000006_reconciliation_audit_compliance.sql
  20260903000007_row_level_security.sql
  20260903000008_core_financial_engine.sql
```

## 3. The core gap — the customer portal is frontend-mocked

`CustomerContext.tsx` imports constants from `src/services/customerDataService.ts`
(`CURRENT_CUSTOMER`, `CUSTOMER_WALLETS`, `CUSTOMER_TRANSACTIONS`, …) and runs
`executeTransfer` / `executeBillPayment` by mutating local React state with fabricated
references, fees, timelines and statuses. **The real ledger, idempotency, RLS and
provider/webhook layers are never exercised by the customer portal.**

### Required change (production)
1. **Replace `CUSTOMER_*` constants with server-side fetches** (Supabase) using the
   existing `src/lib/supabase/server.ts` client, scoped by RLS so a customer only ever
   reads/writes their own rows.
2. **Move `executeTransfer` / `executeBillPayment` / `executeSwap` into server actions**
   (or API routes) that write to the ledger + outbox instead of mutating client state.
3. **Do not trust client-computed amounts.** The server must re-validate amount,
   currency, account ownership, and status.

## 4. Idempotency (schema-ready, not enforced by the portal)

- The schema supports it (`transactions_and_idempotency` migration); `authMiddleware`
  reads an `Idempotency-Key` header.
- **Portal gap:** `executeTransfer` relies only on a client-side `disabled` flag; no
  idempotency key is sent and no server-side dedupe is enforced.
- **Plan:** every mutation accepts a client-generated `Idempotency-Key`; the server
  persists it with a unique constraint on `(customer_id, idempotency_key)` and returns
  the original result on replay. Never rely on the UI button alone.

## 5. Concurrency / double-spend protection

- Schema has `ledger_accounts` (BIGINT) + double-entry trigger.
- **Plan:** wrap balance-affecting writes in a DB transaction with `SELECT ... FOR
  UPDATE` on the debit account, or use an atomic `UPDATE ... SET balance = balance - $x
  WHERE balance >= $x` guard, then insert the paired ledger entries inside the same
  transaction. The double-entry balance trigger is the last line of defence.

## 6. NGN/XOF integrity

- Treat each currency as a separate `ledger_accounts` / `currency` balance. Never sum
  NGN+XOF without an FX conversion that itself is a ledger/authoritative record.
- **Plan:** cross-border writes must record source currency, destination currency,
  source amount, **authoritative exchange rate (from the provider/ledger, NOT a
  frontend `midRate`)**, fee, destination amount, timestamp, and rate source.
  `buildReceiptData` already models these fields.

## 7. Provider / webhook / reconciliation

- Migrations exist; no customer flow uses them.
- **Plan:** after `COMMITTED` ledger entry, emit to the `outbox` table; a worker
  delivers to the provider and the provider callback/webhook (signature-verified,
  idempotent, replay-safe) moves the transaction to its authoritative `COMMITTED` /
  `REVERSED` / `DISPUTED` state. A reconciliation job reconciles `PENDING` transactions
  against provider replies. Never let frontend polling be the source of truth.

## 8. State model alignment

- Schema `ledger_transactions.status`: `PENDING | COMMITTED | REVERSED | DISPUTED`.
- Portal `CustomerTransactionStatus`: `SUCCESSFUL | PENDING | PROCESSING | FAILED |
  REVERSED | CANCELLED`.
- **Plan:** map frontend labels 1:1 to authoritative states (the portal's labels are the
  customer-facing presentation of the ledger state). `SUCCESSFUL` ↔ `COMMITTED`;
  add `DISPUTED` to the UI set; drop or reconcile `PROCESSING`/`CANCELLED`/`FAILED` with
  the real enums.

## 9. Auth → Supabase (replaces format-only middleware)

- `authMiddleware` currently validates token *format* and grants mock scopes.
- **Plan:** validate tokens against Supabase / the key vault; resolve `context.userId`
  and scopes from the actual session. Add RLS on `customers`, `wallets`,
  `ledger_transactions`, `beneficiaries`, `receipts`.

## 10. Receipts — production hardening

- Receipt API is ownership-enforced and returns the typed contract. In production:
  - Persist `receipts` rows (or derive deterministically from `ledger_transactions`).
  - **Never use guessable file URLs.** Serve via signed/expiring authenticated URLs
    (e.g. Supabase Storage with signed URLs, or route through the ownership-checked
    endpoint above). No `/files/receipt/123.pdf` enumeration.
  - A receipt-generation failure must **not** mark the transaction failed — it is a
    document-service issue, communicated separately.

## 11. Secrets

- `.env*` gating: ensure server-only env vars (Supabase keys, provider creds, key vault)
  are never exposed in the client bundle. Confirm no `NEXT_PUBLIC_*` holds a secret.

## 12. Test matrix to run against a live env

- E2E: Login → Dashboard → NGN account → Create transfer → Confirm → Processing →
  Committed → Details → Receipt → Share/Download (NIP + NGN→XOF).
- Security: replay the same transfer (expect no duplicate); change `amount`/`currency`/
  `accountId`/`receiptId` (expect rejection); cross-customer access (expect 403/404).
- Failure: provider timeout, duplicate webhook, out-of-order webhook, receipt-gen
  failure, session expiry, insufficient balance.

---

### Principle
One transaction = one authoritative identity, one authoritative financial state, one
consistent customer experience. The frontend only *presents*; the ledger/provider/webhook
decide.
