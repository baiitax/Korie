import { NextRequest } from "next/server";
import { requireSupportAccess } from "@/lib/support/supportApi";
import { getSupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/health
 * Support-facing service health (§15). Every value is derived live from the
 * real customer_transactions/agency_transactions/support_notifications
 * tables — never invented.
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const overview = await getSupportOpsEngine().getOverview("24H");
  return createSuccessResponse({ items: overview.serviceHealth }, { requestId: access.ctx.requestId });
}
