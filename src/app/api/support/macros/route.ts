import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/** GET /api/support/macros — predefined response templates (§44). */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const enabledOnly = req.nextUrl.searchParams.get("enabled") === "1";
  const rows = SupportOpsEngine.getInstance()
    .getStore()
    .macros.filter((m) => (enabledOnly ? m.enabled : true));
  return createSuccessResponse({ items: rows }, { requestId: access.ctx.requestId });
}

/**
 * POST /api/support/macros — create/update macro (manage_macros only, §45).
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

  const engine = SupportOpsEngine.getInstance();
  const now = new Date().toISOString();
  const macro = {
    id: `MAC-${Date.now().toString(36).toUpperCase()}`,
    key: body.key,
    name: body.name,
    category: (body.category as never) ?? ("GENERAL" as never),
    body: { en: body.body.en, fr: body.body.fr ?? body.body.en, ha: body.body.ha ?? body.body.en },
    variables: body.variables,
    enabled: body.enabled ?? true,
    updatedBy: access.ctx.actor.name,
    updatedAt: now,
  };
  const saved = engine.getStore().addMacro(macro as never);
  return createSuccessResponse({ macro: saved }, { requestId: access.ctx.requestId, status: 201, code: "MACRO_CREATED" });
}
