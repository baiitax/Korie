// =============================================================================
// Agent BDC corridor FX desk BFF — engine rate truth + journaled conversions.
// =============================================================================

import { NextRequest } from "next/server";
import { FxDeskServiceEngine } from "@/lib/agent/FxDeskServiceEngine";
import { AgentFxDirection } from "@/types/agentProducts";
import { withAgentAuth, agentOk, agentErr } from "@/lib/agent/agentRouteAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAgentAuth(req, ["payments:read"], async ({ requestId, environment }) => {
    const engine = FxDeskServiceEngine.getInstance();
    const corridor = engine.corridorReference();
    const orders = engine.listOrders(40);
    return agentOk(
      {
        corridor,
        usdMarket: engine.usdMarketCard(),
        orders,
        quote: corridor
          ? {
              buyXof: engine.quote("BUY_XOF", 10_000),
              sellXof: engine.quote("SELL_XOF", 10_000),
            }
          : null,
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
    const direction = String(body.direction || "") as AgentFxDirection;
    if (direction !== "BUY_XOF" && direction !== "SELL_XOF") {
      return agentErr("UNKNOWN_DIRECTION", "direction must be BUY_XOF or SELL_XOF.", requestId, 400);
    }
    const idempotencyKey = String(body.idempotencyKey || req.headers.get("idempotency-key") || "");
    const result = await FxDeskServiceEngine.getInstance().convert({
      direction,
      xofAmount: Number(body.xofAmount),
      idempotencyKey,
      customerName: body.customerName ? String(body.customerName) : undefined,
      customerPhone: body.customerPhone ? String(body.customerPhone) : undefined,
    });
    if (result.success) {
      return agentOk({ order: result.order, code: result.code }, requestId, environment);
    }
    return agentErr(result.code || "CONVERSION_FAILED", result.message || "The conversion could not be completed.", requestId, 400);
  });
}
