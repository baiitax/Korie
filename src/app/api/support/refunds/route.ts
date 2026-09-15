import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { listDisputeRows, disputeRowToDispute } from "@/lib/support/supportDb";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/refunds
 * Refund & reversal surface (spec §31): support disputes carrying financial
 * decisions, sourced entirely from the real support_disputes table plus the
 * real ledger_transactions rows that public.post_dispute_resolution()
 * posted for them (migration 20260914000052). There is no separate
 * in-memory recovery engine anymore — support_disputes.recovery_case_reference
 * IS the ledger_transactions.transaction_reference of the actual posting,
 * so "recovery cases" are just those same disputes annotated with what the
 * ledger actually recorded.
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "view_transactions")) {
    return operationalError("FORBIDDEN", "Your role cannot view refund and reversal cases.", 403, access.ctx.requestId);
  }

  const rows = await listDisputeRows({ limit: 2000 });
  const relevant = rows.filter(
    (d) =>
      d.category === "REFUND" ||
      d.category === "REVERSAL" ||
      d.decision_type === "REFUND_APPROVED" ||
      d.decision_type === "REVERSAL_APPROVED" ||
      d.decision_type === "PARTIAL_REFUND",
  );
  const disputes = await Promise.all(relevant.map((d) => disputeRowToDispute(d)));

  const decided = relevant.filter((d) => !!d.recovery_case_reference);
  const admin = getSupabaseAdminClient();
  let ledgerByRef = new Map<string, { total_amount: number; currency: string; posted_at: string; status: string }>();
  if (decided.length > 0) {
    const refs = decided.map((d) => d.recovery_case_reference as string);
    const { data: ledgerRows } = await admin
      .from("ledger_transactions")
      .select("transaction_reference, total_amount, currency, posted_at, status")
      .in("transaction_reference", refs);
    ledgerByRef = new Map((ledgerRows || []).map((r) => [r.transaction_reference as string, r as { total_amount: number; currency: string; posted_at: string; status: string }]));
  }

  const recoveryCases = decided.map((d) => {
    const posting = d.recovery_case_reference ? ledgerByRef.get(d.recovery_case_reference) : undefined;
    return {
      id: d.id,
      reference: d.recovery_case_reference as string,
      transactionReference: d.transaction_reference,
      claimantName: d.customer_name,
      category: d.category,
      amount: posting ? Number(posting.total_amount) : Number(d.claim_amount),
      currency: posting ? posting.currency : d.currency,
      priority: d.priority,
      status: posting ? "RESOLVED" : "RESOLVED",
      heldReserve: 0,
      outcome: d.decision_type ?? undefined,
      decidedBy: d.decided_by_officer_id ?? undefined,
      createdAt: posting ? posting.posted_at : d.created_at,
      resolvedAt: d.resolved_at ?? d.decided_at ?? undefined,
    };
  });

  return createSuccessResponse(
    {
      items: disputes.map((d) => ({
        disputeNumber: d.disputeNumber,
        id: d.id,
        category: d.category,
        status: d.status,
        customerName: d.customerName,
        transactionReference: d.transactionReference,
        amount: d.claimAmount,
        currency: d.currency,
        decision: d.decision,
        recoveryCaseReference: d.recoveryCaseReference,
        createdAt: d.createdAt,
      })),
      recoveryCases,
    },
    { requestId: access.ctx.requestId },
  );
}
