// =============================================================================
// Open a support / dispute ticket → ComplaintDisputeEngine (reference, SLA,
// priority). Owner-scoped by the session agent.
// =============================================================================

import { NextRequest } from "next/server";
import { agentPortalEngine } from "@/lib/agent/AgentPortalEngine";
import { withAgentAuth, agentOk, agentErr } from "@/lib/agent/agentRouteAuth";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = [
  "FAILED_TRANSFER",
  "DUPLICATE_DEBIT",
  "AGENT_OVERCHARGING",
  "AGENT_HARASSMENT",
  "UNAUTHORIZED_TRANSACTION",
  "POS_TERMINAL_GLITCH",
  "REFUND_DELAY",
  "FEE_DISPUTE",
  "ACCOUNT_RESTRICTION",
];

export async function POST(req: NextRequest) {
  return withAgentAuth(req, ["payments:write"], async ({ requestId, environment }) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return agentErr("INVALID_BODY", "Malformed request body.", requestId, 400);
    }
    const category = String(body.category || "");
    if (!VALID_CATEGORIES.includes(category)) {
      return agentErr("INVALID_CATEGORY", `category must be one of: ${VALID_CATEGORIES.join(", ")}.`, requestId, 400);
    }
    const description = String(body.description || "").trim();
    if (description.length < 10) {
      return agentErr("DESCRIPTION_REQUIRED", "Describe the issue in at least 10 characters.", requestId, 400);
    }
    const disputedAmount = Number(body.disputedAmount || 0);
    if (!Number.isFinite(disputedAmount) || disputedAmount < 0) {
      return agentErr("INVALID_AMOUNT", "disputedAmount must be a non-negative number.", requestId, 400);
    }

    const ticket = agentPortalEngine.submitTicket({
      category,
      description,
      disputedAmount,
      transactionReference: body.transactionReference ? String(body.transactionReference) : undefined,
      customerName: body.customerName ? String(body.customerName) : undefined,
      customerPhone: body.customerPhone ? String(body.customerPhone) : undefined,
    });
    if ("code" in ticket && !("id" in ticket)) {
      return agentErr(ticket.code, ticket.message, requestId, 400);
    }
    return agentOk({ ticket }, requestId, environment);
  });
}
