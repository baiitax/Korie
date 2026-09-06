import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { getSupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { createSuccessResponse } from "@/lib/security/apiResponse";
import { TicketStatus, TicketPriority, TicketCategory } from "@/types/support";
import { listTicketRows, ticketRowToTicket } from "@/lib/support/supportDb";
import { searchCustomersAndAgents } from "@/lib/support/SupportContexts";

export const dynamic = "force-dynamic";

const STATUS_RANK: Record<string, number> = {
  NEW: 0, TRIAGED: 1, ASSIGNED: 2, IN_PROGRESS: 3, WAITING_FOR_INTERNAL_TEAM: 4,
  WAITING_FOR_CUSTOMER: 5, ESCALATED: 6, REOPENED: 7, RESOLVED: 8, CLOSED: 9,
};

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
  const search = (q.get("q") ?? "").trim();
  const limit = Math.min(100, Math.max(1, parseInt(q.get("limit") ?? "50", 10)));
  const openOnly = q.get("open") === "1";

  const engine = getSupportOpsEngine();
  await engine.sweepAutoClose();
  const now = Date.now();

  const { rows, total } = await listTicketRows({
    status: status ?? undefined,
    openOnly: openOnly && !status,
    priority: priority ?? undefined,
    category: category ?? undefined,
    jurisdiction: jurisdiction ?? undefined,
    unassigned,
    assignedOfficerId: agent ?? undefined,
    search: search || undefined,
    limit: Math.max(limit, 500),
  });

  const sorted = [...rows].sort((a, b) => {
    const ra = STATUS_RANK[a.status] ?? 5;
    const rb = STATUS_RANK[b.status] ?? 5;
    if (ra !== rb) return ra - rb;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const paged = await Promise.all(
    sorted.slice(0, limit).map(async (row) => {
      const ticket = await ticketRowToTicket(row);
      return { ...ticket, sla: engine.computeSla(ticket, Number(row.resolution_paused_ms ?? 0), row.resolution_paused_since ?? undefined, now) };
    }),
  );

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

  const engine = getSupportOpsEngine();

  // The UI accepts an exact customer/agent ID *or* a name in one field.
  // Resolve both (id, name) against the SAME real customers/agents tables
  // the rest of the platform uses — the browser never guesses (§67).
  const params = body as Parameters<typeof engine.createTicket>[0];
  if (!params.customerName && params.customerId) {
    const input = String(params.customerId).trim();
    const hits = await searchCustomersAndAgents(input, 5);
    const hit =
      hits.find((c) => c.id === input) ??
      hits.find((c) => c.name.toLowerCase() === input.toLowerCase()) ??
      hits[0];
    if (hit) {
      params.customerId = hit.id;
      params.customerName = hit.name;
      params.customerType = params.customerType ?? (hit.source === "AGENT" ? "AGENT" : "CUSTOMER");
    }
  }

  const result = await engine.createTicket(
    params,
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
    idempotencyCached: result.data?.cached === true,
  });
}
