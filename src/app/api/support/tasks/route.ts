import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";
import { SupportTaskStatus } from "@/types/supportOps";
import { TicketPriority } from "@/types/support";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/tasks?assignee=me|officerId&status=
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const q = new URLSearchParams(req.nextUrl.search);
  const assignee = q.get("assignee");
  const status = q.get("status");
  let rows = SupportOpsEngine.getInstance().getStore().tasks;
  if (assignee === "me") rows = rows.filter((t) => t.assignedToId === access.ctx.actor.officerId);
  else if (assignee) rows = rows.filter((t) => t.assignedToId === assignee);
  if (status) rows = rows.filter((t) => t.status === status);

  const now = Date.now();
  return createSuccessResponse(
    {
      items: rows.map((t) => ({
        ...t,
        overdue: t.status !== "DONE" && new Date(t.dueAt).getTime() < now,
      })),
    },
    { requestId: access.ctx.requestId },
  );
}

export async function POST(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "manage_tasks")) {
    return operationalError("FORBIDDEN", "Your role cannot create tasks.", 403, access.ctx.requestId);
  }

  let body: { title?: string; description?: string; priority?: TicketPriority; ticketId?: string; customerId?: string; assignedToId?: string; dueAt?: string };
  try {
    body = await req.json();
  } catch {
    return operationalError("INVALID_JSON", "The request body must be valid JSON.", 400, access.ctx.requestId);
  }

  if (!body.title || !body.title.trim()) {
    return operationalError("VALIDATION_FAILED", "Task title is required.", 422, access.ctx.requestId);
  }
  const result = SupportOpsEngine.getInstance().addTask(
    { ...body, title: body.title },
    access.ctx.actor,
  );
  if (!result.ok) {
    return operationalError(result.code ?? "TASK_FAILED", result.error ?? "Could not create the task.",
      result.code === "FORBIDDEN" ? 403 : 422, access.ctx.requestId);
  }
  return createSuccessResponse({ task: result.data }, { requestId: access.ctx.requestId, status: 201, code: "TASK_CREATED" });
}
