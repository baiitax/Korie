// =============================================================================
// Agent services hub overview — product availability, limits, today's KPIs.
// =============================================================================

import { NextRequest } from "next/server";
import { getServicesOverview } from "@/lib/agent/AgentProductOverview";
import { withAgentAuth, agentOk } from "@/lib/agent/agentRouteAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAgentAuth(req, ["payments:read"], async ({ requestId, environment }) => {
    return agentOk(getServicesOverview(), requestId, environment);
  });
}
