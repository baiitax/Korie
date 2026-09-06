import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { SupportTaskStatus } from "@/types/supportOps";
import { getTaskRow, updateTaskRow, taskRowToTask, getOfficerRow } from "@/lib/support/supportDb";

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

  const existing = await getTaskRow(params.id);
  if (!existing) {
    return createErrorResponse({
      code: "TASK_NOT_FOUND",
      message: "This task does not exist.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.title) updates.title = body.title;
  if (body.dueAt) updates.due_at = body.dueAt;
  if (body.assignedToId) {
    const o = await getOfficerRow(body.assignedToId);
    if (!o) return operationalError("OFFICER_NOT_FOUND", "The assignee does not exist.", 422, access.ctx.requestId);
    updates.assigned_to_officer_id = o.id;
  }
  const updated = await updateTaskRow(params.id, updates);
  if (!updated) {
    return createErrorResponse({
      code: "TASK_NOT_FOUND",
      message: "This task no longer exists.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }
  return createSuccessResponse({ task: await taskRowToTask(updated) }, { requestId: access.ctx.requestId, code: "TASK_UPDATED" });
}
