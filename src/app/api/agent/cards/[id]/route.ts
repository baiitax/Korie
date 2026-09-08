// =============================================================================
// Card application lifecycle transitions (event-driven only).
//   verify | atIssuer | issued | delivered | cancel
// =============================================================================

import { NextRequest } from "next/server";
import { CardServiceEngine } from "@/lib/agent/CardServiceEngine";
import { AgentCardApplicationStatus } from "@/types/agentProducts";
import { withAgentAuth, agentOk, agentErr } from "@/lib/agent/agentRouteAuth";

export const dynamic = "force-dynamic";

const ACTION_TO_STATUS: Record<string, AgentCardApplicationStatus> = {
  verify: "KYC_VERIFIED",
  atIssuer: "AT_ISSUER",
  issued: "ISSUED",
  delivered: "DELIVERED",
  cancel: "CANCELLED",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAgentAuth(req, ["payments:write"], async ({ agentId, requestId, environment }) => {
    const { id } = await params;
    let body: any;
    try {
      body = await req.json();
    } catch {
      return agentErr("INVALID_BODY", "Malformed request body.", requestId, 400);
    }
    const status = ACTION_TO_STATUS[String(body.action || "")];
    if (!status) {
      return agentErr("UNKNOWN_TRANSITION", "action must be one of: verify, atIssuer, issued, delivered, cancel.", requestId, 400);
    }
    const result = CardServiceEngine.getInstance().transition(id, status, agentId);
    if (result.success) {
      return agentOk({ application: result.application }, requestId, environment);
    }
    return agentErr(result.code || "TRANSITION_FAILED", result.message || "The transition could not be applied.", requestId, 400);
  });
}
