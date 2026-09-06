import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { resolveTransactionInvestigation } from "@/lib/support/SupportContexts";
import { SupportOpsStore } from "@/lib/support/SupportOpsStore";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/transactions/[id]
 * Transaction support detail (spec §25/§26/§27): authoritative status
 * (engine row wins), timeline, provider trace (references only — never keys
 * or headers), ledger state, related tickets & disputes. Provider trace
 * fields require the view_provider_trace capability; without it the provider
 * block is withheld (the transaction itself remains visible).
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
      message: "No transaction or provider trace exists for this reference.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }

  if (!canTrace && view.provider) {
    const providerName = view.provider.node;
    return createSuccessResponse(
      { ...view, provider: null, timeline: view.timeline, note: "Provider trace requires a senior role.", withheldProvider: providerName ? "withheld" : undefined },
      { requestId: access.ctx.requestId },
    );
  }

  if (canTrace) {
    SupportOpsStore.getInstance().addAudit({
      id: `AUD-SUP-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      officerId: access.ctx.actor.officerId,
      officerName: access.ctx.actor.name,
      officerRole: access.ctx.actor.role,
      action: "PROVIDER_TRACE_VIEWED",
      entityType: "TRANSACTION",
      entityId: view.transactionId,
      details: `Viewed provider trace for ${view.reference} (${view.source}).`,
      jurisdiction: "CROSS_BORDER",
    });
  }

  return createSuccessResponse(view, { requestId: access.ctx.requestId });
}
