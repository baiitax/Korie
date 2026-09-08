// =============================================================================
// Agent kiosk portal summary — engine truth + kiosk runtime, owner-scoped.
// Anchors the till + float subledger once per engine seed on first access.
// =============================================================================

import { NextRequest } from "next/server";
import { agentPortalEngine, ensureAgentFloatSubledger } from "@/lib/agent/AgentPortalEngine";
import { AgentKioskStore } from "@/lib/agent/AgentKioskStore";
import { AGENT_PORTAL_TILL_LOCATION_ID } from "@/lib/agent/agentPortalConstants";
import { CashPositionEngine } from "@/lib/cash/CashPositionEngine";
import { withAgentAuth, agentOk } from "@/lib/agent/agentRouteAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAgentAuth(req, ["payments:read"], async ({ agentId, requestId, environment }) => {
    ensureAgentFloatSubledger();
    const till = CashPositionEngine.getInstance().getPosition(AGENT_PORTAL_TILL_LOCATION_ID);
    AgentKioskStore.ensureTillAnchored(agentId, till?.availablePhysicalCash ?? 0);

    const summary = agentPortalEngine.getPortalSummary();
    return agentOk(summary as unknown as Record<string, unknown>, requestId, environment);
  });
}
