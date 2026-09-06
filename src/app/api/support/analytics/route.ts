import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/analytics
 * Agent performance, SLA compliance, CSAT, escalation & reopen rates (§57–§59).
 * view_analytics required (supervisor+). Metrics are computed from stored
 * records — never invented.
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "view_analytics")) {
    return operationalError("FORBIDDEN", "Your role cannot view support analytics.", 403, access.ctx.requestId);
  }

  return createSuccessResponse(
    SupportOpsEngine.getInstance().getAnalytics(),
    { requestId: access.ctx.requestId },
  );
}
