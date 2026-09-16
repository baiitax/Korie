# Reconciliation & Suspense Policy

**Scope:** agent end-of-day cash reconciliation, break management, and the
operational suspense account (assessment §16 remediation; migration
`20260914000054_reconciliation_suspense.sql`).

**Related:** [accounting-policies.md](accounting-policies.md) ·
[accounting-rules.md](accounting-rules.md) ·
[adashi-accounting-reconciliation-and-audit.md](adashi-accounting-reconciliation-and-audit.md)

---

## 1. Daily agent cash reconciliation (maker step)

Every agent with a `CASH_IN_HAND` float account must count their physical
cash at the end of each business day and submit it via
`POST /api/v1/agency/reconciliation` (the agent portal's reconciliation page
or the agency API). The server — never the client — derives:

- **Opening cash:** yesterday's *actual physical count* (the count is the
  source of truth once it exists), or on the agent's first-ever
  reconciliation, the ledger-derived opening: today's real `CASH_IN_HAND`
  ledger balance minus today's net cash movement.
- **Today's cash in/out:** the sum of the agent's `SUCCESSFUL`
  `agency_transactions` (`CASH_IN`/`CASH_OUT`) since midnight.
- **Expected closing cash** = opening + cash in − cash out.
- **Difference** = actual physical count − expected closing cash.

The agent supplies only the physically counted amount and optional notes.
`submit_agent_cash_reconciliation` records the row in
`agent_cash_reconciliations` (unique per agent per day) and classifies the
result:

| Difference | Status | Ledger action |
|---|---|---|
| `= 0` | `APPROVED` | none — books already match reality |
| `< 0` (shortfall) | `VARIANCE_JOURNALED` | **immediate variance journal** (§2) |
| `> 0` (overage) | `OVERAGE_PENDING_REVIEW` | **none** (§3) |

## 2. Shortfalls journal immediately

A shortfall means custodial value is missing. The books must reflect
physical reality at all times, so the count itself posts the journal
(`CASHVAR-YYYYMMDD-<agent-prefix>`):

- **DEBIT** the agent's `CASH_IN_HAND` account by the shortfall — the
  ledger position drops to what was physically counted.
- **CREDIT** `SUSPENSE-<ccy>` by the same amount — a positive suspense
  balance is a *recovery claim*: value is missing and unexplained.

The journal is balanced and posts through the same integrity-trigger regime
as every other journal (stored balance must equal journal-derived balance;
debits must equal credits; entries are immutable once committed).

**Once journaled, the day's count is locked.** Re-submission raises
`RECONCILIATION_ALREADY_JOURNALED` (the API surfaces it as a 409 with
guidance). Corrections go through an audited resolution — never through
silently overwriting a count that is already on the books.

## 3. Overages never auto-create ledger value

An overage means the till holds *more* than the books say. The conservative
rule: **no ledger value is created from unexplained excess.** The agent's
ledger position stays where the journals put it, and the reconciliation is
parked as `OVERAGE_PENDING_REVIEW` for back-office investigation (a missed
customer transaction, a counting error, or someone else's money).

Rationale: creating claimable value from an unexplained surplus invites
fraud (agents "finding" money); withholding value until the source is
documented does not.

## 4. Resolution (checker step — segregation of duties)

The agent who submits the count is the **maker**; the back-office reviewer
who resolves the break is the **checker** — distinct by construction.
Resolution happens in the Money Approvals console (`/admin/approvals`,
`CASH_VARIANCE` queue) or via `resolve_cash_variance`, and every
ledger-moving resolution posts through `post_adjustment_journal`
(reference `CASHVAR-RES-…`), which enforces a meaningful reason, a named
actor, balanced lines, and idempotency by reference.

**Shortfall resolutions** (status `VARIANCE_JOURNALED`):

| Resolution | Journal | Meaning |
|---|---|---|
| `RECOVERED_TO_TILL` | reverse the variance journal (CREDIT agent cash / DEBIT suspense) | the cash was found (e.g. second drawer) or the count was corrected on recount |
| `WRITTEN_OFF` | DEBIT suspense / CREDIT `OPERATIONAL-LOSS-<ccy>` | investigation closed; the loss is recognised |

**Overage resolutions** (status `OVERAGE_PENDING_REVIEW`):

| Resolution | Journal | Meaning |
|---|---|---|
| `DOCUMENTED_AS_MISSED_TRANSACTION` | none | the source was identified and the missed transaction was booked through its own sanctioned path |
| `RETURNED_TO_SENDER` | none | the excess was physically returned to its owner |
| `FORFEITED_TO_INCOME` | DEBIT agent cash / CREDIT `MISC-INCOME-<ccy>` | unclaimed after the hold period; the excess is handed to company custody and recognised as miscellaneous income |

All resolutions set `status = RESOLVED` with `resolution`,
`resolution_notes`, `resolved_at`, `resolved_by` recorded on the
reconciliation row. Double-resolution and resolution of a non-break status
are refused (`RECONCILIATION_NOT_RESOLVABLE_STATUS_*`).

## 5. Suspense account rules

- One suspense account per currency (`SUSPENSE-NGN`, `SUSPENSE-XOF`), type
  `LIABILITY`, provisioned at zero and moved **only** by journal entries.
- **Positive balance = unexplained shortfall claim** (missing value we are
  trying to recover). **Zero = no open breaks.** (Overages never enter
  suspense — see §3.)
- Suspense is a parking account, not a P&L hiding place: every debit/credit
  must trace to a reconciliation id, and the daily close (§6) reports its
  balance and unresolved variance ageing. Nothing may be netted, reclassified
  or "squashed" in suspense without a resolution of the type listed in §4.
- Target: suspense returns to zero within **3 business days** of a break.
  The daily close flags breaks older than 3 days individually.

## 6. Daily close integration (detection is bounded)

`run_daily_financial_close` now reports, per close:

- `unresolved_cash_variances` — count and absolute amount of reconciliations
  in `VARIANCE_JOURNALED` / `OVERAGE_PENDING_REVIEW`;
- `cash_variance_aging_over_3d` — the individual aged breaks (reconciliation
  id, agent, status, difference, age in days);
- `suspense_balances` — non-zero suspense balances per currency;
- `false_match_reconciliations` — aggregator reconciliations asserting
  `MATCHED` with all totals zero and no discrepancies. A record that
  compares nothing to nothing is a false positive, not evidence of
  reconciliation (the F17 lesson from the assessment).

Unresolved variances, non-zero suspense balances and false matches each add
to `unresolved_exceptions_count`, so a close cannot read
`CLOSED_BALANCED` while a cash break is open. Variance journals
(`CASHVAR-*`) are linked to their reconciliation rows and are excluded from
the orphan-journal count.

## 7. Architectural constraint: one journal per account per transaction

The ledger's deferred integrity triggers validate each queued account
update against the *final* journal-derived balance of the transaction. Two
journals touching the same account inside one database transaction will
therefore collide at commit (`LEDGER_BALANCE_DRIFT`). Operational flows are
already transaction-separated (agent submits at close of business; back
office resolves later; the close only reads), and this must be preserved:
**never chain a submit and a resolve, or two adjustments on the same
account, in a single transaction.**

## 8. Audit trail

Every step lands in the existing audit surfaces: the reconciliation row
itself (counts, expected, difference, statuses, resolver identity), the
`ledger_transactions`/`ledger_entries` journals (`CASHVAR-*`,
`CASHVAR-RES-*`) with immutable entries, `audit_events` from
`post_adjustment_journal`, and the daily close metrics. The approval
console's resolve actions pass the reviewer's identity as
`resolved_by`/`p_posted_by` — traceable end to end.
