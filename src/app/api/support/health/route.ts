import { NextRequest } from "next/server";
import { requireSupportAccess } from "@/lib/support/supportApi";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/health
 * Support-facing service health (§15). Every value is derived from
 * HealthCheckEngine.getDeepHealth() — never invented.
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const overview = SupportOpsEngine.getInstance().getOverview("24H");
  return createSuccessResponse({ items: overview.serviceHealth }, { requestId: access.ctx.requestId });
}
