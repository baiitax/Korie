import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { DisputeStatus, DisputeDecisionType } from "@/types/supportOps";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/disputes/[id]
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const engine = SupportOpsEngine.getInstance();
  const d = engine.getStore().getDispute(params.id);
  if (!d) {
    return createErrorResponse({
      code: "DISPUTE_NOT_FOUND",
      message: "This dispute does not exist.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }
  const ticket = d.ticketId ? engine.getStore().getTicket(d.ticketId) : undefined;
  return createSuccessResponse({ dispute: d, ticket }, { requestId: access.ctx.requestId });
}

/**
 * PATCH /api/support/disputes/[id]
 * { status }                        → advance the workflow (RBAC update_dispute)
 * { decision: { type, reason } }    → financial decision (RBAC decide_dispute +
 *                                     decisionOwner match). Approved
 *                                     refund/reversal creates the recovery case
 *                                     in the authoritative recovery engine —
 *                                     Support never touches balances (§31).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;

  let body: { status?: DisputeStatus; detail?: string; decision?: { type: DisputeDecisionType; reason: string } };
  try {
    body = await req.json();
  } catch {
    return operationalError("INVALID_JSON", "The request body must be valid JSON.", 400, access.ctx.requestId);
  }

  const engine = SupportOpsEngine.getInstance();

  if (body.decision) {
    if (!body.decision.type || !body.decision.reason) {
      return operationalError("VALIDATION_FAILED", "decision.type and decision.reason are required.", 422, access.ctx.requestId);
    }
    const result = engine.decideDispute(params.id, body.decision, access.ctx.actor);
    if (!result.ok) {
      return operationalError(result.code ?? "DECISION_FAILED", result.error ?? "Decision not recorded.",
        result.code === "FORBIDDEN" || result.code === "FORBIDDEN_DECISION_OWNER" ? 403 : result.code === "RECOVERY_ENGINE_FAILURE" ? 502 : 404,
        access.ctx.requestId);
    }
    return createSuccessResponse({ dispute: result.data }, { requestId: access.ctx.requestId, code: "DISPUTE_DECIDED" });
  }

  if (body.status) {
    const result = engine.advanceDispute(params.id, body.status, access.ctx.actor, body.detail);
    if (!result.ok) {
      return operationalError(result.code ?? "DISPUTE_UPDATE_FAILED", result.error ?? "Could not update the dispute.",
        result.code === "FORBIDDEN" ? 403 : 404, access.ctx.requestId);
    }
    return createSuccessResponse({ dispute: result.data }, { requestId: access.ctx.requestId, code: "DISPUTE_UPDATED" });
  }

  return operationalError("NOTHING_TO_DO", "Provide status or decision.", 422, access.ctx.requestId);
}
