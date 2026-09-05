import { ComplaintDisputeEngine } from "@/lib/complaints/ComplaintDisputeEngine";
import type { CustomerTransaction } from "@/types/customer";

/**
 * src/lib/customer/disputeStatus.ts
 *
 * A customer's dispute has to be visible on the transaction it disputes, and it
 * has to be visible *without* letting a customer edit the ledger.
 *
 * Why it is done at read time: `TransactionService` writes a status exactly
 * twice — both `'SUCCESSFUL'` (lines 120 and 259). There is no status-mutating
 * API on it, because settlement state belongs to the switch and the reversal
 * job, not to whoever opened a support case. If the disputes route "fixed" the
 * display by writing `DISPUTED` onto the row, it would be giving any signed-in
 * customer a way to change the settlement record of their own transactions.
 *
 * So the ledger stays what it is, and the portal joins the two facts it owns:
 *
 *     bank says: settled      +   you have an open case against this row
 *     →  the portal renders DISPUTED (not a quiet SUCCESSFUL)
 *
 * `DISPUTED` is a first-class `CustomerTransactionStatus`, so nothing has to be
 * invented downstream: History, the detail payload and the notification bell all
 * read the same derived state. Closing the case in the compliance queue removes
 * it — that store is shared, which is the point.
 */

/** Terminal complaint states, per `ComplaintStatus` in regulatoryConsumerEngine. */
const CLOSED_CASE_STATES: ReadonlySet<string> = new Set(["RESOLVED", "CLOSED"]);

/**
 * Transaction references this customer has a live case against. Scoped by the
 * session's own customer id — never by a reference the client asked about.
 */
export function openDisputeRefsFor(ownerCustomerId: string): Set<string> {
  const refs = new Set<string>();
  if (!ownerCustomerId) return refs;
  for (const complaint of ComplaintDisputeEngine.getInstance().getComplaints()) {
    if (complaint.customerId !== ownerCustomerId) continue;
    if (CLOSED_CASE_STATES.has(complaint.status)) continue;
    if (complaint.transactionReference) refs.add(complaint.transactionReference);
  }
  return refs;
}

/**
 * Overlay onto projected rows. Idempotent, and a no-op for the (normal) case of
 * no open disputes, so History pays nothing when there is nothing to show.
 * A row the engine already marks `DISPUTED` is left untouched: the ledger wins
 * if the two ever disagree, because the ledger is the settlement record.
 */
export function withDisputeState(
  items: CustomerTransaction[],
  openRefs: ReadonlySet<string>,
): CustomerTransaction[] {
  if (openRefs.size === 0) return items;
  let changed = false;
  const next = items.map((tx) => {
    if (tx.status === "DISPUTED" || !openRefs.has(tx.reference)) return tx;
    changed = true;
    return { ...tx, status: "DISPUTED" as const };
  });
  return changed ? next : items;
}

/** Single-row form used by the detail route. */
export function decorateDetail(
  tx: CustomerTransaction,
  openRefs: ReadonlySet<string>,
): CustomerTransaction {
  if (tx.status === "DISPUTED" || !openRefs.has(tx.reference)) return tx;
  return { ...tx, status: "DISPUTED" };
}
