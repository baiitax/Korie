// =============================================================================
// Onboard a walk-in customer → CustomerLifecycleEngine (real customer master).
// =============================================================================

import { NextRequest } from "next/server";
import { agentPortalEngine } from "@/lib/agent/AgentPortalEngine";
import { withAgentAuth, agentOk, agentErr } from "@/lib/agent/agentRouteAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withAgentAuth(req, ["agency:write", "payments:write"], async ({ requestId, environment }) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return agentErr("INVALID_BODY", "Malformed request body.", requestId, 400);
    }
    const result = agentPortalEngine.onboardCustomer({
      fullName: String(body.fullName || ""),
      phone: String(body.phone || ""),
      email: String(body.email || ""),
    });
    if ("code" in result && !("id" in result)) {
      return agentErr(result.code, result.message, requestId, 400);
    }
    return agentOk({ customer: result }, requestId, environment);
  });
}
