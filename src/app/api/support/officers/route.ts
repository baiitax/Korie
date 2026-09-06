import { NextRequest } from "next/server";
import { requireSupportAccess } from "@/lib/support/supportApi";
import { createSuccessResponse } from "@/lib/security/apiResponse";
import { capabilitiesFor } from "@/lib/support/SupportPermissions";
import { listOfficers, activeTicketCountsByOfficer, officerRowToOfficer } from "@/lib/support/supportDb";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/officers
 * Real officer roster (support_officers), with live active-ticket counts and
 * the capability set per officer so the client can reflect (never enforce)
 * RBAC.
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const [rows, counts] = await Promise.all([listOfficers(), activeTicketCountsByOfficer()]);
  const officers = rows.map((o) => ({
    ...officerRowToOfficer(o, counts.get(o.id) ?? 0),
    capabilities: capabilitiesFor(o.role),
  }));
  return createSuccessResponse({ items: officers }, { requestId: access.ctx.requestId });
}
