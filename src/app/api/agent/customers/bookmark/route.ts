// =============================================================================
// Bookmark a frequently served walk-in customer (kiosk-local).
// =============================================================================

import { NextRequest } from "next/server";
import { agentPortalEngine } from "@/lib/agent/AgentPortalEngine";
import { withAgentAuth, agentOk, agentErr } from "@/lib/agent/agentRouteAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withAgentAuth(req, ["payments:read"], async ({ requestId, environment }) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return agentErr("INVALID_BODY", "Malformed request body.", requestId, 400);
    }
    const customerKey = String(body.customerKey || "");
    if (!customerKey) {
      return agentErr("CUSTOMER_REQUIRED", "customerKey is required.", requestId, 400);
    }
    const { bookmarked } = agentPortalEngine.toggleCustomerBookmark(customerKey);
    return agentOk({ customerKey, bookmarked }, requestId, environment);
  });
}
