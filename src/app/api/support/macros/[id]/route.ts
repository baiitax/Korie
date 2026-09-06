import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/support/macros/[id]
 * Update body / enabled (manage_macros only).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "manage_macros")) {
    return operationalError("FORBIDDEN", "Your role cannot manage macros.", 403, access.ctx.requestId);
  }

  let body: { body?: { en?: string; fr?: string; ha?: string }; enabled?: boolean; name?: string };
  try {
    body = await req.json();
  } catch {
    return operationalError("INVALID_JSON", "The request body must be valid JSON.", 400, access.ctx.requestId);
  }

  const store = SupportOpsEngine.getInstance().getStore();
  const existing = store.getMacro(params.id);
  if (!existing) {
    return createErrorResponse({
      code: "MACRO_NOT_FOUND",
      message: "This macro does not exist.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }
  const updates: Parameters<typeof store.updateMacro>[1] = {
    updatedBy: access.ctx.actor.name,
    updatedAt: new Date().toISOString(),
  };
  if (body.body) updates.body = { ...existing.body, ...body.body } as never;
  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
  if (body.name) updates.name = body.name;
  const updated = store.updateMacro(existing.id, updates);
  return createSuccessResponse({ macro: updated }, { requestId: access.ctx.requestId, code: "MACRO_UPDATED" });
}
