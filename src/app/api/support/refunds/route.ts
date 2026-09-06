import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { DisputeChargebackEngine } from "@/lib/recovery/DisputeChargebackEngine";
import { listDisputeRows, disputeRowToDispute } from "@/lib/support/supportDb";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/refunds
 * Refund & reversal surface (spec §31): support disputes carrying financial
 * decisions (from the real support_disputes table) + the AUTHORITATIVE
 * recovery cases from DisputeChargebackEngine. Support only ever REQUESTS —
 * execution state comes from the recovery engine.
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

  const recoveryCases = DisputeChargebackEngine.getInstance()
    .getDisputes()
    .map((c) => ({
      id: c.id,
      reference: c.disputeReference,
      transactionReference: c.transactionReference,
      claimantName: c.claimantName ?? c.claimantId,
      category: c.category,
      amount: c.claimAmount,
      currency: c.currency,
      priority: c.priority,
      status: c.status,
      heldReserve: c.heldReserveAmount,
      outcome: c.resolutionOutcome,
      decidedBy: c.decidedBy,
      createdAt: c.createdAt,
      resolvedAt: c.resolvedAt,
    }));

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
