# Adashi Cycle Lifecycle, Contribution Obligations & Auto-Collection

## 1. Cycle Lifecycle State Machine

```
[SCHEDULED]
     │
     ▼
[CONTRIBUTION_OPEN] ──▶ (Due date arrived; auto-debit batch initiated)
     │
     ▼
[COLLECTION_IN_PROGRESS]
     │
     ▼
[COLLECTION_COMPLETED] ──▶ (All member obligations successfully paid)
     │
     ▼
[PAYOUT_ELIGIBILITY_CHECK]
     │
     ▼
[PAYOUT_PROCESSING] ────▶ (Dispatched through Payment Switch to Core Ledger)
     │
     ▼
[PAYOUT_COMPLETED] ─────▶ (Ledger journal posted & beneficiary notified)
     │
     ▼
[RECONCILED & CLOSED]
```

---

## 2. Contribution Obligation Generation

For every active cycle, individual contribution obligation records are generated in `adashi_contribution_obligations`:
- `obligation_id`
- `adashi_id`, `cycle_number`
- `member_id`, `customer_id`
- `expected_amount`, `currency`
- `due_date`, `grace_deadline`
- `status` (`SCHEDULED`, `PAID`, `FAILED`, `UNKNOWN`, `OVERDUE`, `DEFAULTED`)
- `ledger_journal_id`, `payment_reference`

---

## 3. Auto-Collection & Idempotency Safeguards

1. **Scheduler Dispatch**: The automated collection worker queries open obligations at due time.
2. **Payment Switch Execution**: Calls `POST /api/v1/payments` with unique `Idempotency-Key = idemp-ada-obl-{obligation_id}`.
3. **Unknown Outcome Protocol**: If the payment switch returns HTTP 504 Timeout or `UNKNOWN`, the obligation enters status `UNKNOWN`. The scheduler **never** re-debits the account; a background status query reconciles the transaction before any retry is permitted.
4. **Exponential Retry Policy**: For accounts with insufficient funds, retries occur at $T_0 + 6\text{h}$, $T_0 + 18\text{h}$, and $T_0 + 24\text{h}$ within the configured grace period.
