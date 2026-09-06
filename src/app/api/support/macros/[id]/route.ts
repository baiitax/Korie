import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { getMacroRow, updateMacroRow, macroRowToMacro } from "@/lib/support/supportDb";

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

  const existing = await getMacroRow(params.id);
  if (!existing) {
    return createErrorResponse({
      code: "MACRO_NOT_FOUND",
      message: "This macro does not exist.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }
  const updates: Record<string, unknown> = { updated_by: access.ctx.actor.name };
  if (body.body?.en) updates.body_en = body.body.en;
  if (body.body?.fr) updates.body_fr = body.body.fr;
  if (body.body?.ha) updates.body_ha = body.body.ha;
  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
  if (body.name) updates.name = body.name;

  const updated = await updateMacroRow(existing.id, updates);
  if (!updated) {
    return createErrorResponse({
      code: "MACRO_NOT_FOUND",
      message: "This macro no longer exists.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }
  return createSuccessResponse({ macro: macroRowToMacro(updated) }, { requestId: access.ctx.requestId, code: "MACRO_UPDATED" });
}
