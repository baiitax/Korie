// =============================================================================
// Agent bill-pay BFF — catalog truth + cash-at-till payments (engine journaled).
// =============================================================================

import { NextRequest } from "next/server";
import { BillerServiceEngine } from "@/lib/agent/BillerServiceEngine";
import { AgentBillerCategory } from "@/types/agentProducts";
import { withAgentAuth, agentOk, agentErr } from "@/lib/agent/agentRouteAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAgentAuth(req, ["payments:read"], async ({ requestId, environment }) => {
    const engine = BillerServiceEngine.getInstance();
    const category = (req.nextUrl.searchParams.get("category") as AgentBillerCategory | null) || undefined;
    return agentOk(
      {
        categories: engine.listCategories(),
        billers: engine.listBillers(category),
        payments: engine.listPayments(60),
      },
      requestId,
      environment,
    );
  });
}

export async function POST(req: NextRequest) {
  return withAgentAuth(req, ["payments:write"], async ({ requestId, environment }) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return agentErr("INVALID_BODY", "Malformed request body.", requestId, 400);
    }
    const idempotencyKey = String(body.idempotencyKey || req.headers.get("idempotency-key") || "");
    const result = await BillerServiceEngine.getInstance().payBill({
      billerId: String(body.billerId || ""),
      amount: Number(body.amount),
      idempotencyKey,
      customerName: body.customerName ? String(body.customerName) : undefined,
      customerPhone: body.customerPhone ? String(body.customerPhone) : undefined,
    });
    if (result.success) {
      return agentOk(
        { payment: result.operation, billerId: String(body.billerId || ""), code: result.code },
        requestId,
        environment,
      );
    }
    return agentErr(result.code || "PAYMENT_FAILED", result.message || "The bill payment could not be completed.", requestId, 400);
  });
}
