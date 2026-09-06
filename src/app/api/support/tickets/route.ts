import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { createSuccessResponse } from "@/lib/security/apiResponse";
import { TicketStatus, TicketPriority, TicketCategory } from "@/types/support";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/tickets
 * Filtered, paginated queue with computed SLA (never stored SLA).
 * Filters: status, priority, category, jurisdiction, unassigned, agent, q, open.
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const q = new URLSearchParams(req.nextUrl.search);
  const status = q.get("status") as TicketStatus | null;
  const priority = q.get("priority") as TicketPriority | null;
  const category = q.get("category") as TicketCategory | null;
  const jurisdiction = q.get("jurisdiction");
  const unassigned = q.get("unassigned") === "1";
  const agent = q.get("agent");
  const search = (q.get("q") ?? "").toLowerCase();
  const limit = Math.min(100, Math.max(1, parseInt(q.get("limit") ?? "50", 10)));

  const engine = SupportOpsEngine.getInstance();
  engine.sweepAutoClose();
  const now = Date.now();
  const store = engine.getStore();

  let rows = store.tickets;
  if (status) rows = rows.filter((t) => t.status === status);
  else if (q.get("open") === "1") rows = rows.filter((t) => store.isTicketOpen(t));
  if (priority) rows = rows.filter((t) => t.priority === priority);
  if (category) rows = rows.filter((t) => t.category === category);
  if (jurisdiction && jurisdiction !== "ALL") rows = rows.filter((t) => t.jurisdiction === jurisdiction);
  if (unassigned) rows = rows.filter((t) => !t.assignedOfficerId && store.isTicketOpen(t));
  if (agent) rows = rows.filter((t) => t.assignedOfficerId === agent);
  if (search) {
    rows = rows.filter(
      (t) =>
        t.ticketNumber.toLowerCase().includes(search) ||
        t.subject.toLowerCase().includes(search) ||
        t.customerName.toLowerCase().includes(search) ||
        t.customerId.toLowerCase().includes(search) ||
        (t.relatedTransactionId ?? "").toLowerCase().includes(search),
    );
  }

  // Sort: open first (by lifecycle stage), then resolved/closed by recency.
  const rank: Record<string, number> = {
    NEW: 0, TRIAGED: 1, ASSIGNED: 2, IN_PROGRESS: 3, WAITING_FOR_INTERNAL_TEAM: 4,
    WAITING_FOR_CUSTOMER: 5, ESCALATED: 6, REOPENED: 7, RESOLVED: 8, CLOSED: 9,
  };
  rows = [...rows].sort((a, b) => {
    const ra = rank[a.status] ?? 5;
    const rb = rank[b.status] ?? 5;
    if (ra !== rb) return ra - rb;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const total = rows.length;
  const paged = rows.slice(0, limit).map((t) => ({ ...t, sla: engine.computeSla(t, now) }));

  return createSuccessResponse(
    { items: paged, total, limit, hasMore: total > limit },
    { requestId: access.ctx.requestId },
  );
}

/**
 * POST /api/support/tickets
 * Idempotent ticket creation (idempotency-key header or body.idempotencyKey).
 */
export async function POST(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;

  if (!hasCapability(access.ctx.actor.role, "create_ticket")) {
    return operationalError("FORBIDDEN", "Your role cannot create tickets.", 403, access.ctx.requestId);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return operationalError("INVALID_JSON", "The request body must be valid JSON.", 400, access.ctx.requestId);
  }

  const engine = SupportOpsEngine.getInstance();
  const result = engine.createTicket(
    body as Parameters<typeof engine.createTicket>[0],
    access.ctx.actor,
    (req.headers.get("idempotency-key") as string | null) ?? (body.idempotencyKey as string | undefined),
  );
  if (!result.ok) {
    return operationalError(
      result.code ?? "TICKET_CREATION_FAILED",
      result.error ?? "Could not create the ticket.",
      result.code === "VALIDATION_FAILED" ? 422 : 500,
      access.ctx.requestId,
    );
  }
  return createSuccessResponse(result.data, {
    requestId: access.ctx.requestId,
    status: 201,
    code: "TICKET_CREATED",
    idempotencyCached: (result.data as { cached?: boolean }).cached === true,
  });
}
