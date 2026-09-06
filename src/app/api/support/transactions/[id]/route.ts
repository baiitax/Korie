import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { resolveTransactionInvestigation } from "@/lib/support/SupportContexts";
import { insertAuditRow } from "@/lib/support/supportDb";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

function auditId(): string {
  return `AUD-SUP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * GET /api/support/transactions/[id]
 * Transaction support detail (spec §25/§26/§27), read from the SAME
 * customer_transactions/agency_transactions tables the Customer/Agency
 * portals write: authoritative status, an honest timeline built only from
 * the row's own fields (no fabricated provider stages), provider reference
 * (never keys/headers), and related tickets & disputes. Provider trace
 * fields require the view_provider_trace capability; without it the
 * provider block is withheld (the transaction itself remains visible).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "view_transactions")) {
    return operationalError("FORBIDDEN", "Your role cannot view transactions.", 403, access.ctx.requestId);
  }

  const canTrace = hasCapability(access.ctx.actor.role, "view_provider_trace");
  const view = await resolveTransactionInvestigation(params.id);
  if (!view) {
    return createErrorResponse({
      code: "TRANSACTION_NOT_FOUND",
      message: "No transaction exists for this reference.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }

  if (!canTrace && view.provider) {
    return createSuccessResponse(
      { ...view, provider: null, note: "Provider trace requires a senior role." },
      { requestId: access.ctx.requestId },
    );
  }

  if (canTrace && view.provider) {
    await insertAuditRow({
      id: auditId(),
      officer_id: access.ctx.actor.officerId,
      officer_name: access.ctx.actor.name,
      officer_role: access.ctx.actor.role,
      action: "PROVIDER_TRACE_VIEWED",
      entity_type: "TRANSACTION",
      entity_id: view.transactionId,
      details: `Viewed provider trace for ${view.reference} (${view.source}).`,
      jurisdiction: "CROSS_BORDER",
    });
  }

  return createSuccessResponse(view, { requestId: access.ctx.requestId });
}
