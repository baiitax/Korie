import { NextRequest } from "next/server";
import { requireSupportAccess } from "@/lib/support/supportApi";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";
import { capabilitiesFor } from "@/lib/support/SupportPermissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/officers
 * Roster for the sandbox officer switcher + assignment UI. Includes the
 * capability set per officer so the client can reflect (never enforce) RBAC.
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const officers = SupportOpsEngine.getInstance().getStore().officers.map((o) => ({
    ...o,
    capabilities: capabilitiesFor(o.role),
  }));
  return createSuccessResponse({ items: officers }, { requestId: access.ctx.requestId });
}
