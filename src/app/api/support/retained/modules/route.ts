import { NextRequest } from "next/server";
import { requireSupportAccess } from "@/lib/support/supportApi";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/retained/modules
 * Read-mostly operational modules carried over from the previous support
 * build: playbooks, incidents, automation rules & logs, QA reviews,
 * training, capacity. Served from the same store so the data path is one.
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const store = SupportOpsEngine.getInstance().getStore();
  return createSuccessResponse(
    {
      playbooks: store.playbooks,
      incidents: store.incidents,
      automationRules: store.automationRules,
      automationLogs: store.automationLogs,
      qaReviews: store.qaReviews,
      training: store.training,
      capacity: store.capacity,
    },
    { requestId: access.ctx.requestId },
  );
}
