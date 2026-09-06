import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { getSupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { TicketStatus } from "@/types/support";
import {
  getTicketRow,
  ticketRowToTicket,
  listMessagesForTicket,
  messageRowToMessage,
  eventsForTicket,
  eventRowToEvent,
  listDisputeRows,
  disputeRowToDispute,
  listEscalationRows,
  escalationRowToEscalation,
  getCsatForTicket,
  csatRowToRecord,
  listTicketRows,
} from "@/lib/support/supportDb";

export const dynamic = "force-dynamic";

const CAP_MAP: Partial<Record<TicketStatus, Parameters<typeof hasCapability>[1]>> = {
  TRIAGED: "triage_ticket",
  ASSIGNED: "assign_ticket",
  IN_PROGRESS: "start_progress",
  WAITING_FOR_CUSTOMER: "wait_customer",
  WAITING_FOR_INTERNAL_TEAM: "wait_internal",
  ESCALATED: "escalate_ticket",
  RESOLVED: "resolve_ticket",
  CLOSED: "close_ticket",
  REOPENED: "reopen_ticket",
};

/**
 * GET /api/support/tickets/[id]
 * Ticket + computed SLA + event history + related disputes + allowed
 * transitions for the acting officer (the UI renders only what the server
 * says is legal — spec §06).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const engine = getSupportOpsEngine();
  const row = await getTicketRow(params.id);
  if (!row) {
    return createErrorResponse({
      code: "TICKET_NOT_FOUND",
      message: "This ticket does not exist or is unavailable to you.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }

  const messages = (await listMessagesForTicket(row.id)).map(messageRowToMessage);
  const ticket = await ticketRowToTicket(row, messages);

  const allowed = engine.allowedTransitions(ticket.status).filter((to) => {
    const cap = CAP_MAP[to];
    return cap ? hasCapability(access.ctx.actor.role, cap) : true;
  });

  const [eventRows, disputeRows, escalationRows, csatRow, relatedRows] = await Promise.all([
    eventsForTicket(ticket.id),
    listDisputeRows({ ticketId: ticket.id }),
    listEscalationRows({ ticketId: ticket.id }),
    getCsatForTicket(ticket.id),
    listTicketRows({ customerId: ticket.customerId, openOnly: true, limit: 6 }),
  ]);

  const disputes = await Promise.all(disputeRows.map((d) => disputeRowToDispute(d)));
  const escalations = await Promise.all(escalationRows.map((e) => escalationRowToEscalation(e)));
  const relatedTickets = (await Promise.all(relatedRows.rows.filter((t) => t.id !== ticket.id).slice(0, 5).map((t) => ticketRowToTicket(t))));

  return createSuccessResponse(
    {
      ticket,
      sla: engine.computeSla(ticket, Number(row.resolution_paused_ms ?? 0), row.resolution_paused_since ?? undefined),
      events: eventRows.map(eventRowToEvent),
      disputes,
      escalations,
      csat: csatRow ? csatRowToRecord(csatRow) : undefined,
      relatedTickets,
      allowedTransitions: allowed,
      capabilities: {
        canReply: hasCapability(access.ctx.actor.role, "send_customer_message"),
        canInternalNote: hasCapability(access.ctx.actor.role, "add_internal_note"),
        canAssign: hasCapability(access.ctx.actor.role, "assign_ticket"),
        canChangePriority: hasCapability(access.ctx.actor.role, "change_priority"),
        canCreateDispute: hasCapability(access.ctx.actor.role, "create_dispute"),
        canEscalate: hasCapability(access.ctx.actor.role, "create_escalation"),
        canUnmaskPii: hasCapability(access.ctx.actor.role, "unmask_pii"),
        canViewProviderTrace: hasCapability(access.ctx.actor.role, "view_provider_trace"),
        canRequestRefund: hasCapability(access.ctx.actor.role, "request_refund"),
        canSubmitCsat: true,
      },
    },
    { requestId: access.ctx.requestId },
  );
}

/**
 * PATCH /api/support/tickets/[id]
 * { status? } | { priority? } | { assignedOfficerId? }
 * Each write goes through the engine (validated transition + RBAC + audit).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;

  let body: { status?: TicketStatus; priority?: string; assignedOfficerId?: string; reason?: string; rootCause?: string };
  try {
    body = await req.json();
  } catch {
    return operationalError("INVALID_JSON", "The request body must be valid JSON.", 400, access.ctx.requestId);
  }

  const engine = getSupportOpsEngine();

  if (body.status) {
    const result = await engine.transition(params.id, body.status, access.ctx.actor, {
      reason: body.reason,
      rootCause: body.rootCause,
    });
    if (!result.ok) {
      return operationalError(result.code ?? "TRANSITION_FAILED", result.error ?? "Transition not allowed.",
        result.code === "FORBIDDEN" ? 403 : result.code === "INVALID_TRANSITION" ? 409 : 404,
        access.ctx.requestId);
    }
    return createSuccessResponse({ ticket: result.data }, { requestId: access.ctx.requestId, code: "TICKET_UPDATED" });
  }

  if (body.priority) {
    const result = await engine.changePriority(params.id, body.priority as never, access.ctx.actor);
    if (!result.ok) {
      return operationalError(result.code ?? "PRIORITY_CHANGE_FAILED", result.error ?? "Priority change failed.",
        result.code === "FORBIDDEN" ? 403 : 422, access.ctx.requestId);
    }
    return createSuccessResponse({ ticket: result.data }, { requestId: access.ctx.requestId, code: "PRIORITY_UPDATED" });
  }

  if (body.assignedOfficerId) {
    const result = await engine.assignTicket(params.id, body.assignedOfficerId, access.ctx.actor);
    if (!result.ok) {
      return operationalError(result.code ?? "ASSIGNMENT_FAILED", result.error ?? "Assignment failed.",
        result.code === "FORBIDDEN" ? 403 : 404, access.ctx.requestId);
    }
    return createSuccessResponse({ ticket: result.data }, { requestId: access.ctx.requestId, code: "TICKET_ASSIGNED" });
  }

  return operationalError("NOTHING_TO_DO", "Provide status, priority or assignedOfficerId.", 422, access.ctx.requestId);
}
