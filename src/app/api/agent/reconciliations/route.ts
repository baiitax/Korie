// =============================================================================
// End-of-day cash count submission → CashReconciliationEngine (variance,
// MATCHED/SHORT/OVER). Denomination breakdown: {"1000": n, "500": m, ...}.
// =============================================================================

import { NextRequest } from "next/server";
import { agentPortalEngine } from "@/lib/agent/AgentPortalEngine";
import { withAgentAuth, agentOk, agentErr } from "@/lib/agent/agentRouteAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withAgentAuth(req, ["payments:write"], async ({ requestId, environment }) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return agentErr("INVALID_BODY", "Malformed request body.", requestId, 400);
    }
    const denominations: Record<string, number> = {};
    if (!body.denominations || typeof body.denominations !== "object") {
      return agentErr("DENOMINATIONS_REQUIRED", "Provide a denominations breakdown, e.g. {1000: 5, 500: 10}.", requestId, 400);
    }
    for (const [denom, count] of Object.entries(body.denominations)) {
      const n = Number(denom);
      const c = Number(count);
      if (!Number.isInteger(n) || n <= 0 || !Number.isInteger(c) || c < 0) {
        return agentErr("INVALID_DENOMINATION", `Invalid denomination/count: ${denom} x ${count}.`, requestId, 400);
      }
      denominations[String(n)] = c;
    }
    if (Object.keys(denominations).length === 0) {
      return agentErr("EMPTY_COUNT", "The cash count is empty.", requestId, 400);
    }

    const record = agentPortalEngine.submitDailyCashCount(denominations);
    return agentOk({ reconciliation: record }, requestId, environment);
  });
}
