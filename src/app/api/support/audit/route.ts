import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { SupportOpsStore } from "@/lib/support/SupportOpsStore";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/audit?limit=&action=
 * Immutable support audit trail (§52). view_audit required (supervisor+).
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "view_audit")) {
    return operationalError("FORBIDDEN", "Your role cannot view the audit trail.", 403, access.ctx.requestId);
  }

  const q = new URLSearchParams(req.nextUrl.search);
  const limit = Math.min(200, Math.max(1, parseInt(q.get("limit") ?? "50", 10)));
  const action = q.get("action");
  let rows = SupportOpsStore.getInstance().audit;
  if (action) rows = rows.filter((a) => a.action.includes(action));
  return createSuccessResponse({ items: rows.slice(0, limit), total: rows.length }, { requestId: access.ctx.requestId });
}
