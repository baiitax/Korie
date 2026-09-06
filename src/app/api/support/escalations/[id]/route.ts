import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { getSupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { EscalationStatus } from "@/types/supportOps";
import { getEscalationRow, escalationRowToEscalation, getTicketRow, ticketRowToTicket } from "@/lib/support/supportDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const row = await getEscalationRow(params.id);
  if (!row) {
    return createErrorResponse({
      code: "ESCALATION_NOT_FOUND",
      message: "This escalation does not exist.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }
  const e = await escalationRowToEscalation(row);
  const ticketRow = await getTicketRow(e.ticketId);
  const ticket = ticketRow ? await ticketRowToTicket(ticketRow) : undefined;
  return createSuccessResponse({ escalation: e, ticket }, { requestId: access.ctx.requestId });
}

/**
 * PATCH /api/support/escalations/[id]
 * { status?: PENDING|IN_REVIEW|ACTIONED|RESOLVED, resolutionNote?, assignedToName? }
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;

  let body: { status?: EscalationStatus; resolutionNote?: string; assignedToName?: string };
  try {
    body = await req.json();
  } catch {
    return operationalError("INVALID_JSON", "The request body must be valid JSON.", 400, access.ctx.requestId);
  }

  const engine = getSupportOpsEngine();
  const result = await engine.updateEscalation(params.id, body, access.ctx.actor);
  if (!result.ok) {
    return operationalError(result.code ?? "ESCALATION_UPDATE_FAILED", result.error ?? "Could not update the escalation.",
      result.code === "FORBIDDEN" ? 403 : 404, access.ctx.requestId);
  }
  return createSuccessResponse({ escalation: result.data }, { requestId: access.ctx.requestId, code: "ESCALATION_UPDATED" });
}
