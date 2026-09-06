import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { TicketStatus } from "@/types/support";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/tickets/[id]
 * Ticket + computed SLA + event history + related disputes + allowed
 * transitions for the acting officer (the UI renders only what the server
 * says is legal — spec §06).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const engine = SupportOpsEngine.getInstance();
  const ticket = engine.getStore().getTicket(params.id);
  if (!ticket) {
    return createErrorResponse({
      code: "TICKET_NOT_FOUND",
      message: "This ticket does not exist or is unavailable to you.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }

  const allowed: string[] = engine.allowedTransitions(ticket.status).filter((to) => {
    const capMap: Partial<Record<TicketStatus, Parameters<typeof hasCapability>[1]>> = {
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
    const cap = capMap[to];
    return cap ? hasCapability(access.ctx.actor.role, cap) : true;
  });

  const disputes = engine.getStore().disputes.filter((d) => d.ticketId === ticket.id);
  const escalations = engine.getStore().escalations.filter((e) => e.ticketId === ticket.id);
  const csat = engine.getStore().csat.find((c) => c.ticketId === ticket.id);
  const relatedTickets = engine
    .getStore()
    .ticketsForCustomer(ticket.customerId)
    .filter((t) => t.id !== ticket.id && engine.getStore().isTicketOpen(t))
    .slice(0, 5);

  return createSuccessResponse(
    {
      ticket,
      sla: engine.computeSla(ticket),
      events: engine.getStore().eventsForTicket(ticket.id),
      disputes,
      escalations,
      csat,
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

  const engine = SupportOpsEngine.getInstance();

  if (body.status) {
    const result = engine.transition(params.id, body.status, access.ctx.actor, {
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
    const result = engine.changePriority(params.id, body.priority as never, access.ctx.actor);
    if (!result.ok) {
      return operationalError(result.code ?? "PRIORITY_CHANGE_FAILED", result.error ?? "Priority change failed.",
        result.code === "FORBIDDEN" ? 403 : 422, access.ctx.requestId);
    }
    return createSuccessResponse({ ticket: result.data }, { requestId: access.ctx.requestId, code: "PRIORITY_UPDATED" });
  }

  if (body.assignedOfficerId) {
    const result = engine.assignTicket(params.id, body.assignedOfficerId, access.ctx.actor);
    if (!result.ok) {
      return operationalError(result.code ?? "ASSIGNMENT_FAILED", result.error ?? "Assignment failed.",
        result.code === "FORBIDDEN" ? 403 : 404, access.ctx.requestId);
    }
    return createSuccessResponse({ ticket: result.data }, { requestId: access.ctx.requestId, code: "TICKET_ASSIGNED" });
  }

  return operationalError("NOTHING_TO_DO", "Provide status, priority or assignedOfficerId.", 422, access.ctx.requestId);
}
