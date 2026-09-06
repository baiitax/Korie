import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { listAuditRows } from "@/lib/support/supportDb";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/audit?limit=&action=
 * Immutable support audit trail (§52), read from support_audit_log.
 * view_audit required (supervisor+).
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "view_audit")) {
    return operationalError("FORBIDDEN", "Your role cannot view the audit trail.", 403, access.ctx.requestId);
  }

  const q = new URLSearchParams(req.nextUrl.search);
  const limit = Math.min(200, Math.max(1, parseInt(q.get("limit") ?? "50", 10)));
  const action = q.get("action") ?? undefined;
  const { rows, total } = await listAuditRows({ action, limit });
  const items = rows.map((a) => ({
    id: a.id,
    timestamp: a.created_at,
    officerId: a.officer_id,
    officerName: a.officer_name,
    officerRole: a.officer_role,
    action: a.action,
    entityType: a.entity_type,
    entityId: a.entity_id,
    details: a.details,
    jurisdiction: a.jurisdiction,
  }));
  return createSuccessResponse({ items, total }, { requestId: access.ctx.requestId });
}
