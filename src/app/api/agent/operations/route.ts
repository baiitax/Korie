// =============================================================================
// Agent kiosk operations (cash-in / cash-out / NIP transfer) — REAL double
// entry through LedgerService + agent float subledger + till tracking.
// Idempotency key required; replays return the original operation.
// =============================================================================

import { NextRequest } from "next/server";
import { agentPortalEngine } from "@/lib/agent/AgentPortalEngine";
import { AgentPortalOperationKind } from "@/types/agentPortal";
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
    const kind = String(body.kind || "") as AgentPortalOperationKind;
    if (!["CASH_IN", "CASH_OUT", "TRANSFER_NIP"].includes(kind)) {
      return agentErr("INVALID_KIND", "kind must be CASH_IN, CASH_OUT or TRANSFER_NIP.", requestId, 400);
    }
    const idempotencyKey = String(
      body.idempotencyKey || req.headers.get("idempotency-key") || "",
    );
    const amount = Number(body.amount);
    const accountMode = body.accountMode === true;

    const result = await agentPortalEngine.executeOperation({
      kind,
      amount,
      idempotencyKey,
      customerName: String(body.customerName || ""),
      customerPhone: body.customerPhone ? String(body.customerPhone) : undefined,
      customerAccount: body.customerAccount ? String(body.customerAccount) : undefined,
      customerBank: body.customerBank ? String(body.customerBank) : undefined,
      accountMode,
    });

    if (result.success) {
      return agentOk(
        { operation: result.operation, code: result.code, idempotencyCached: result.code === "IDEMPOTENT_REPLAY" },
        requestId,
        environment,
      );
    }
    const status = result.code === "INSUFFICIENT_FLOAT" || result.code === "INSUFFICIENT_TILL_CASH" ? 402 : 400;
    return agentErr(result.code || "OPERATION_FAILED", result.message || "Operation failed.", requestId, status);
  });
}
