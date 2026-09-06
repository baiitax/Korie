import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { getSupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/analytics
 * Agent performance, SLA compliance, CSAT, escalation & reopen rates (§57–§59).
 * view_analytics required (supervisor+). Metrics are computed live from the
 * real support_tickets/support_csat_records/support_escalations tables —
 * never invented.
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "view_analytics")) {
    return operationalError("FORBIDDEN", "Your role cannot view support analytics.", 403, access.ctx.requestId);
  }

  const data = await getSupportOpsEngine().getAnalytics();
  return createSuccessResponse(data, { requestId: access.ctx.requestId });
}
