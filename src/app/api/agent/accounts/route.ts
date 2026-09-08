// =============================================================================
// Agent account-opening BFF — open real KoriePay NGN accounts for onboarded
// customers (AccountLifecycleEngine + auto wallet subledger), list joined state.
// =============================================================================

import { NextRequest } from "next/server";
import { AccountServiceEngine } from "@/lib/agent/AccountServiceEngine";
import { withAgentAuth, agentOk, agentErr } from "@/lib/agent/agentRouteAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAgentAuth(req, ["payments:read"], async ({ requestId, environment }) => {
    const engine = AccountServiceEngine.getInstance();
    return agentOk(
      {
        products: engine.listOpenableProducts(),
        rows: engine.portalAccounts().map((row) => ({
          customer: row.customer,
          accounts: row.accounts
            .filter((a) => a.status === "OPEN")
            .map((a) => ({
              accountNumber: a.accountNumber,
              accountName: a.accountName,
              productCode: a.productCode,
              currency: a.currency,
              assignedBankName: a.assignedBankName,
              openedAt: a.openedAt,
            })),
        })),
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
    const result = await AccountServiceEngine.getInstance().openAccount({
      customerPhone: String(body.customerPhone || ""),
      productCode: String(body.productCode || ""),
      idempotencyKey,
    });
    if (result.success) {
      return agentOk({ account: result.account, code: result.code }, requestId, environment);
    }
    return agentErr(result.code || "ACCOUNT_OPEN_FAILED", result.message || "The account could not be opened.", requestId, 400);
  });
}
