import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { getSupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { DisputeStatus, DisputeDecisionType } from "@/types/supportOps";
import { getDisputeRow, disputeRowToDispute, getTicketRow, ticketRowToTicket } from "@/lib/support/supportDb";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/disputes/[id]
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const row = await getDisputeRow(params.id);
  if (!row) {
    return createErrorResponse({
      code: "DISPUTE_NOT_FOUND",
      message: "This dispute does not exist.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }
  const d = await disputeRowToDispute(row);
  const ticketRow = d.ticketId ? await getTicketRow(d.ticketId) : null;
  const ticket = ticketRow ? await ticketRowToTicket(ticketRow) : undefined;

  // PS-2: if a financial decision on this dispute is waiting for a checker,
  // surface it so every officer viewing the dispute knows nothing has posted.
  const admin = getSupabaseAdminClient();
  const { data: pendingReq } = await admin
    .from("maker_checker_requests")
    .select("id, status, maker_email, maker_role, payload, created_at")
    .eq("action_type", "DISPUTE_FINANCIAL_DECISION")
    .eq("status", "PENDING")
    .contains("payload", { dispute_id: row.id })
    .maybeSingle();
  const pendingApproval = pendingReq
    ? {
        requestId: pendingReq.id as string,
        status: String(pendingReq.status ?? "PENDING"),
        decisionType: String((pendingReq.payload as Record<string, unknown> | null)?.decision_type ?? ""),
        makerEmail: String(pendingReq.maker_email ?? ""),
        makerRole: String(pendingReq.maker_role ?? ""),
        createdAt: String(pendingReq.created_at ?? ""),
      }
    : undefined;

  return createSuccessResponse(
    { dispute: { ...d, pendingApproval }, ticket },
    { requestId: access.ctx.requestId },
  );
}

/**
 * PATCH /api/support/disputes/[id]
 * { status }                                            → advance the workflow (RBAC update_dispute)
 * { decision: { type, reason, partialAmount? } }        → financial decision (RBAC decide_dispute +
 *                                                          decisionOwner match). REFUND_APPROVED /
 *                                                          REVERSAL_APPROVED / PARTIAL_REFUND post a
 *                                                          real, balanced double-entry ledger
 *                                                          transaction crediting the customer's wallet
 *                                                          (public.post_dispute_resolution) — Support
 *                                                          decides, the database is the sole authority
 *                                                          over balances (§31). partialAmount is
 *                                                          required for PARTIAL_REFUND and is capped
 *                                                          server-side at the transaction's amount+fee.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;

  let body: { status?: DisputeStatus; detail?: string; decision?: { type: DisputeDecisionType; reason: string; partialAmount?: number } };
  try {
    body = await req.json();
  } catch {
    return operationalError("INVALID_JSON", "The request body must be valid JSON.", 400, access.ctx.requestId);
  }

  const engine = getSupportOpsEngine();

  if (body.decision) {
    if (!body.decision.type || !body.decision.reason) {
      return operationalError("VALIDATION_FAILED", "decision.type and decision.reason are required.", 422, access.ctx.requestId);
    }
    if (body.decision.type === "PARTIAL_REFUND" && !(Number(body.decision.partialAmount) > 0)) {
      return operationalError("VALIDATION_FAILED", "A positive partialAmount is required for PARTIAL_REFUND.", 422, access.ctx.requestId);
    }
    const result = await engine.decideDispute(params.id, body.decision, access.ctx.actor);
    if (!result.ok) {
      return operationalError(result.code ?? "DECISION_FAILED", result.error ?? "Decision not recorded.",
        result.code === "FORBIDDEN" || result.code === "FORBIDDEN_DECISION_OWNER" ? 403
          : result.code === "DISPUTE_ALREADY_DECIDED" || result.code === "DISPUTE_DECISION_CONFLICT" ? 409
          : result.code === "LEDGER_POSTING_FAILED" ? 502
          : result.code === "PARTIAL_AMOUNT_REQUIRED" ? 422
          : 404,
        access.ctx.requestId);
    }
    // Financial decisions are now the MAKER step of the checked flow — the
    // response tells the officer a different person must approve before the
    // wallet-crediting journal posts (migration 20260914000062).
    if (result.code === "PENDING_CHECKER_APPROVAL") {
      return createSuccessResponse(
        { dispute: result.data },
        { requestId: access.ctx.requestId, code: "DISPUTE_DECISION_SUBMITTED_FOR_CHECKER_APPROVAL" },
      );
    }
    return createSuccessResponse({ dispute: result.data }, { requestId: access.ctx.requestId, code: "DISPUTE_DECIDED" });
  }

  if (body.status) {
    const result = await engine.advanceDispute(params.id, body.status, access.ctx.actor, body.detail);
    if (!result.ok) {
      return operationalError(result.code ?? "DISPUTE_UPDATE_FAILED", result.error ?? "Could not update the dispute.",
        result.code === "FORBIDDEN" ? 403 : 404, access.ctx.requestId);
    }
    return createSuccessResponse({ dispute: result.data }, { requestId: access.ctx.requestId, code: "DISPUTE_UPDATED" });
  }

  return operationalError("NOTHING_TO_DO", "Provide status or decision.", 422, access.ctx.requestId);
}
