import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { SupportTaskStatus } from "@/types/supportOps";

export const dynamic = "force-dynamic";

/** PATCH /api/support/tasks/[id] — { status, title?, dueAt?, assignedToId? } */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "manage_tasks")) {
    return operationalError("FORBIDDEN", "Your role cannot update tasks.", 403, access.ctx.requestId);
  }

  let body: { status?: SupportTaskStatus; title?: string; dueAt?: string; assignedToId?: string };
  try {
    body = await req.json();
  } catch {
    return operationalError("INVALID_JSON", "The request body must be valid JSON.", 400, access.ctx.requestId);
  }

  const engine = SupportOpsEngine.getInstance();
  const store = engine.getStore();
  const existing = store.getTask(params.id);
  if (!existing) {
    return createErrorResponse({
      code: "TASK_NOT_FOUND",
      message: "This task does not exist.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }

  const updates: Parameters<typeof store.updateTask>[1] = {};
  if (body.status) updates.status = body.status;
  if (body.title) updates.title = body.title;
  if (body.dueAt) updates.dueAt = body.dueAt;
  if (body.assignedToId) {
    const o = store.getOfficer(body.assignedToId);
    if (!o) return operationalError("OFFICER_NOT_FOUND", "The assignee does not exist.", 422, access.ctx.requestId);
    updates.assignedToId = o.id;
    updates.assignedToName = o.fullName;
  }
  const updated = store.updateTask(params.id, updates);
  return createSuccessResponse({ task: updated }, { requestId: access.ctx.requestId, code: "TASK_UPDATED" });
}
