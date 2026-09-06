import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { createSuccessResponse } from "@/lib/security/apiResponse";
import { listMacroRows, macroRowToMacro, insertMacroRow } from "@/lib/support/supportDb";

export const dynamic = "force-dynamic";

/** GET /api/support/macros — predefined response templates (§44). */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const enabledOnly = req.nextUrl.searchParams.get("enabled") === "1";
  const rows = await listMacroRows(enabledOnly);
  return createSuccessResponse({ items: rows.map((m) => macroRowToMacro(m)) }, { requestId: access.ctx.requestId });
}

/**
 * POST /api/support/macros — create macro (manage_macros only, §45).
 */
export async function POST(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "manage_macros")) {
    return operationalError("FORBIDDEN", "Your role cannot manage macros.", 403, access.ctx.requestId);
  }

  let body: {
    key?: string;
    name?: string;
    category?: string;
    body?: { en?: string; fr?: string; ha?: string };
    variables?: string[];
    enabled?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return operationalError("INVALID_JSON", "The request body must be valid JSON.", 400, access.ctx.requestId);
  }
  if (!body.key || !body.name || !body.body?.en) {
    return operationalError("VALIDATION_FAILED", "key, name and body.en are required.", 422, access.ctx.requestId);
  }

  const row = await insertMacroRow({
    key: body.key,
    name: body.name,
    category: body.category ?? "GENERAL",
    body_en: body.body.en,
    body_fr: body.body.fr ?? body.body.en,
    body_ha: body.body.ha ?? body.body.en,
    variables: body.variables ?? [],
    enabled: body.enabled ?? true,
    updated_by: access.ctx.actor.name,
  });
  return createSuccessResponse({ macro: macroRowToMacro(row) }, { requestId: access.ctx.requestId, status: 201, code: "MACRO_CREATED" });
}
