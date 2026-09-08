// =============================================================================
// Agent float sweep → real journal (float liability → clearing pool), float
// subledger zeroed, settlement row recorded. No canned messages.
// =============================================================================

import { NextRequest } from "next/server";
import { agentPortalEngine } from "@/lib/agent/AgentPortalEngine";
import { withAgentAuth, agentOk, agentErr } from "@/lib/agent/agentRouteAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withAgentAuth(req, ["payments:write"], async ({ requestId, environment }) => {
    const result = await agentPortalEngine.requestFloatSweep();
    if ("code" in result && !("id" in result)) {
      return agentErr(result.code, result.message, requestId, 400);
    }
    return agentOk({ settlement: result }, requestId, environment);
  });
}
