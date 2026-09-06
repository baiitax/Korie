import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";
import { EscalationDestination } from "@/types/supportOps";
import { TicketPriority } from "@/types/support";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/escalations?status=&destination=
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const q = new URLSearchParams(req.nextUrl.search);
  const status = q.get("status");
  const destination = q.get("destination");
  let rows = SupportOpsEngine.getInstance().getStore().escalations;
  if (status) rows = rows.filter((e) => e.status === status);
  if (destination) rows = rows.filter((e) => e.destination === destination);

  return createSuccessResponse({ items: rows, total: rows.length }, { requestId: access.ctx.requestId });
}

/**
 * POST /api/support/escalations
 * { ticketId, reason, destination, priority?, assignedToName? }
 * Destination is constrained by the acting role's allowed destinations
 * (spec §35) and the ticket transitions to ESCALATED through the engine.
 */
export async function POST(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;

  let body: {
    ticketId?: string;
    reason?: string;
    destination?: EscalationDestination;
    priority?: TicketPriority;
    assignedToName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return operationalError("INVALID_JSON", "The request body must be valid JSON.", 400, access.ctx.requestId);
  }

  const engine = SupportOpsEngine.getInstance();
  const result = engine.createEscalation(
    {
      ticketId: body.ticketId ?? "",
      reason: body.reason ?? "",
      destination: (body.destination ?? "MANAGEMENT") as EscalationDestination,
      priority: body.priority,
      assignedToName: body.assignedToName,
    },
    access.ctx.actor,
  );
  if (!result.ok) {
    return operationalError(result.code ?? "ESCALATION_FAILED", result.error ?? "Could not create the escalation.",
      result.code === "FORBIDDEN" || result.code === "FORBIDDEN_DESTINATION" ? 403 : result.code === "TICKET_NOT_FOUND" ? 404 : 500,
      access.ctx.requestId);
  }
  return createSuccessResponse({ escalation: result.data }, { requestId: access.ctx.requestId, status: 201, code: "ESCALATION_CREATED" });
}

void hasCapability;
