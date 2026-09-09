import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import type { SupportActor } from "@/lib/support/SupportOpsEngine";
import type { TicketCategory, TicketPriority, SupportJurisdiction } from "@/types/support";
import type { ArticleLanguage } from "@/types/supportOps";

/**
 * Sync-bridge: mirrors a customer-filed complaint (public.customer_disputes,
 * written by POST /api/customer/portal/disputes) into the real support
 * back office (public.support_tickets, and — when it references a specific
 * transaction with a claimed amount — public.support_disputes) so a support
 * officer actually sees and can work every case a customer opens.
 *
 * Before this existed, customer_disputes was a dead-end table: nothing in
 * src/lib/support or src/app/api/support ever read it (confirmed via
 * `grep -rn "customer_disputes" src/app/api/support src/lib/support` ==
 * zero matches), so a customer's dispute sat unseen forever unless a human
 * happened to browse the admin "customer-disputes" resource table directly.
 *
 * Design choices:
 *  - Runs at the API layer (called from the portal route right after the
 *    customer_disputes insert), not a DB trigger — this lets it reuse
 *    SupportOpsEngine.createTicket/createDispute's existing validation,
 *    SLA computation, auto-assignment and notification logic instead of
 *    re-implementing it in SQL.
 *  - Idempotent: keyed off `customer-dispute-{customer_disputes.id}`, so a
 *    retry (see resyncFailedCustomerDisputes) never double-creates a ticket.
 *  - Best-effort / non-blocking: customer_disputes remains the source of
 *    truth for the customer-facing view. If the support-side mirror fails,
 *    the customer's dispute is still saved (sync_status='FAILED', with
 *    sync_error recorded) and a background sweep can retry it — a support
 *    outage must never block a customer from filing a complaint.
 *  - Acts under a real, seeded support_officers identity (OFF-SYS-BRIDGE,
 *    TIER_1_JUNIOR / TIER_0_AUTOMATION — see migration
 *    20260909000044_customer_dispute_support_sync_bridge.sql) rather than a
 *    fabricated actor id, so every ticket/dispute/event it creates is
 *    attributable in the audit trail exactly like a human officer's work.
 */

const CATEGORY_TO_TICKET: Record<string, TicketCategory> = {
  FAILED_TRANSFER: "FAILED_TRANSACTION",
  DUPLICATE_DEBIT: "TRANSFER",
  UNAUTHORIZED_TRANSACTION: "FRAUD_SECURITY",
  REFUND_DELAY: "REFUND",
  FEE_DISPUTE: "COMPLAINT",
  ACCOUNT_RESTRICTION: "LOGIN_ACCESS",
  OTHER: "COMPLAINT",
};

const CATEGORY_TO_DISPUTE: Record<string, string> = {
  FAILED_TRANSFER: "FAILED_TRANSACTION",
  DUPLICATE_DEBIT: "DUPLICATE",
  UNAUTHORIZED_TRANSACTION: "UNAUTHORIZED",
  REFUND_DELAY: "REFUND",
  FEE_DISPUTE: "OTHER",
  ACCOUNT_RESTRICTION: "OTHER",
  OTHER: "OTHER",
};

// customer_disputes.priority is P1/P2/P3 (P1 = most urgent, matching how
// the portal route always files new disputes as P1 today); support tickets
// use a five-step LOW..CRITICAL scale.
const PRIORITY_TO_TICKET: Record<string, TicketPriority> = {
  P1: "URGENT",
  P2: "NORMAL",
  P3: "LOW",
};

let bridgeOfficerId: string | null = null;

async function getBridgeActor(requestId?: string): Promise<SupportActor | null> {
  if (bridgeOfficerId) return { officerId: bridgeOfficerId, name: "Customer Dispute Sync Bridge", role: "TIER_1_JUNIOR", requestId };
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_officers")
    .select("id")
    .eq("officer_code", "OFF-SYS-BRIDGE")
    .maybeSingle();
  if (error || !data) return null;
  bridgeOfficerId = data.id as string;
  return { officerId: bridgeOfficerId, name: "Customer Dispute Sync Bridge", role: "TIER_1_JUNIOR", requestId };
}

export interface CustomerDisputeForSync {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  category: string;
  priority: string;
  description: string;
  disputedAmount?: number | null;
  currency?: "NGN" | "XOF" | null;
  transactionReference?: string | null;
  jurisdiction?: SupportJurisdiction;
  language?: ArticleLanguage;
  requestId?: string;
}

async function markSync(disputeId: string, patch: Record<string, unknown>) {
  const admin = getSupabaseAdminClient();
  await admin.from("customer_disputes").update(patch).eq("id", disputeId);
}

/**
 * Mirrors one customer_disputes row into support_tickets (always) and, when
 * it references a specific transaction with a positive claimed amount, also
 * into support_disputes (a formal, decision-owner-routed dispute case).
 * Never throws — callers get a result object and the customer_disputes row
 * itself is updated with the outcome so it can be inspected or retried.
 */
export async function syncCustomerDisputeToSupport(
  d: CustomerDisputeForSync,
): Promise<{ ok: boolean; ticketId?: string; disputeId?: string; error?: string }> {
  try {
    const actor = await getBridgeActor(d.requestId);
    if (!actor) {
      const error = "Sync bridge officer (OFF-SYS-BRIDGE) not found — has the migration been applied?";
      await markSync(d.id, { sync_status: "FAILED", sync_error: error });
      return { ok: false, error };
    }

    const engine = getSupportOpsEngine();
    const ticketCategory = CATEGORY_TO_TICKET[d.category] ?? "COMPLAINT";
    const priority = PRIORITY_TO_TICKET[d.priority] ?? "NORMAL";
    const idempotencyKey = `customer-dispute-${d.id}`;

    const ticketResult = await engine.createTicket(
      {
        customerName: d.customerName,
        customerId: d.customerId,
        subject: `Customer dispute: ${d.category.replace(/_/g, " ").toLowerCase()}`,
        description: d.description,
        category: ticketCategory,
        priority,
        customerType: "CUSTOMER",
        customerEmail: d.customerEmail,
        customerPhone: d.customerPhone,
        jurisdiction: d.jurisdiction ?? "NG",
        channel: "WEB_PORTAL",
        language: d.language ?? "en",
        relatedTransactionId: d.transactionReference ?? undefined,
        tags: ["customer-dispute-bridge"],
      },
      actor,
      idempotencyKey,
    );

    if (!ticketResult.ok || !ticketResult.data) {
      await markSync(d.id, { sync_status: "FAILED", sync_error: ticketResult.error });
      return { ok: false, error: ticketResult.error };
    }

    const ticketId = ticketResult.data.ticket.id;
    let disputeId: string | undefined;

    // Only open a formal support_disputes case (decision-owner routed,
    // eligible for the DisputeChargebackEngine recovery path) when the
    // customer actually claimed money against a specific transaction —
    // e.g. ACCOUNT_RESTRICTION or a generic FEE_DISPUTE with no amount
    // doesn't need one; a human officer can still open one manually from
    // the ticket if it turns out to be warranted.
    if (d.transactionReference && d.disputedAmount && d.disputedAmount > 0 && d.currency) {
      const disputeResult = await engine.createDispute(
        {
          ticketId,
          category: (CATEGORY_TO_DISPUTE[d.category] as never) ?? "OTHER",
          transactionReference: d.transactionReference,
          customerId: d.customerId,
          customerName: d.customerName,
          claim: d.description,
          claimAmount: d.disputedAmount,
          currency: d.currency,
          priority,
          jurisdiction: d.jurisdiction ?? "NG",
        },
        actor,
      );
      if (disputeResult.ok && disputeResult.data) {
        disputeId = disputeResult.data.id;
      }
      // A dispute-creation failure here is non-fatal to the sync as a whole
      // — the ticket already exists and is visible/workable; we still mark
      // the row SYNCED (with the ticket) rather than FAILED, but note the
      // dispute error for visibility.
      await markSync(d.id, {
        synced_ticket_id: ticketId,
        synced_dispute_id: disputeId ?? null,
        sync_status: "SYNCED",
        sync_error: disputeResult.ok ? null : `Ticket synced; dispute case creation failed: ${disputeResult.error}`,
        synced_at: new Date().toISOString(),
      });
    } else {
      await markSync(d.id, {
        synced_ticket_id: ticketId,
        sync_status: "SYNCED",
        sync_error: null,
        synced_at: new Date().toISOString(),
      });
    }

    return { ok: true, ticketId, disputeId };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown sync error";
    await markSync(d.id, { sync_status: "FAILED", sync_error: error });
    return { ok: false, error };
  }
}

/**
 * Retry sweep for any customer_disputes row the bridge failed to sync on
 * first attempt (support DB hiccup, transient error, etc). Safe to call
 * repeatedly/on a schedule — createTicket's idempotencyKey guarantees a
 * previously-succeeded-but-misrecorded attempt won't create a duplicate
 * ticket.
 */
export async function resyncFailedCustomerDisputes(limit = 25): Promise<{ attempted: number; synced: number }> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("customer_disputes")
    .select(
      "id, customer_id, category, priority, description, disputed_amount, currency, transaction_reference, customers:customer_id(first_name, last_name, email, phone, country, preferred_language)",
    )
    .neq("sync_status", "SYNCED")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error || !data) return { attempted: 0, synced: 0 };

  let synced = 0;
  for (const row of data as Record<string, unknown>[]) {
    const customer = (row.customers ?? {}) as Record<string, unknown>;
    const jurisdiction: SupportJurisdiction = customer.country === "NE" ? "NE" : "NG";
    const language: ArticleLanguage = (["en", "ha", "fr"] as const).includes(customer.preferred_language as never)
      ? (customer.preferred_language as ArticleLanguage)
      : "en";
    const result = await syncCustomerDisputeToSupport({
      id: row.id as string,
      customerId: row.customer_id as string,
      customerName: [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer",
      customerEmail: customer.email as string | undefined,
      customerPhone: customer.phone as string | undefined,
      category: row.category as string,
      priority: row.priority as string,
      description: row.description as string,
      disputedAmount: row.disputed_amount as number | null,
      currency: row.currency as "NGN" | "XOF" | null,
      transactionReference: row.transaction_reference as string | null,
      jurisdiction,
      language,
    });
    if (result.ok) synced += 1;
  }
  return { attempted: data.length, synced };
}
