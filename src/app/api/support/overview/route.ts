import { NextRequest } from "next/server";
import { requireSupportAccess } from "@/lib/support/supportApi";
import { getSupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/overview?range=24H|7D|30D|90D
 * KPIs, immediate-attention queue, trend, categories, LIVE service health
 * (derived from the real customer_transactions/agency_transactions/
 * support_notifications tables), recent activity.
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const rangeParam = req.nextUrl.searchParams.get("range");
  const range = rangeParam === "7D" || rangeParam === "30D" || rangeParam === "90D" ? rangeParam : "24H";
  const payload = await getSupportOpsEngine().getOverview(range);
  return createSuccessResponse(payload, {
    requestId: access.ctx.requestId,
    message: "Support overview",
  });
}
