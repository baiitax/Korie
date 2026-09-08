// =============================================================================
// Agent ATM/card BFF — products + applications (lifecycle via PATCH [id]).
// Customer identity is resolved server-side from the kiosk onboarded registry.
// =============================================================================

import { NextRequest } from "next/server";
import { CardServiceEngine } from "@/lib/agent/CardServiceEngine";
import { AccountServiceEngine } from "@/lib/agent/AccountServiceEngine";
import { withAgentAuth, agentOk, agentErr } from "@/lib/agent/agentRouteAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAgentAuth(req, ["payments:read"], async ({ requestId, environment }) => {
    const engine = CardServiceEngine.getInstance();
    const accountEngine = AccountServiceEngine.getInstance();
    return agentOk(
      {
        products: engine.listProducts(),
        applications: engine.listApplications(),
        applicants: accountEngine.listOnboarded().map((c) => ({
          customerId: c.customerId,
          fullName: c.fullName,
          phone: c.phone,
          kycTier: c.kycTier,
          accounts: accountEngine
            .accountsForCustomer(c.customerId)
            .filter((a) => a.currency === "NGN" && a.status === "OPEN")
            .map((a) => ({ accountNumber: a.accountNumber, accountName: a.accountName, productCode: a.productCode })),
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
    const phone = String(body.customerPhone || "").replace(/\s/g, "");
    const customer = AccountServiceEngine.getInstance()
      .listOnboarded()
      .find((c) => c.phone.replace(/\s/g, "") === phone);
    if (!customer) {
      return agentErr(
        "CUSTOMER_NOT_ONBOARDED",
        "Onboard this customer first from the Customers page before applying for a card.",
        requestId,
        400,
      );
    }
    const idempotencyKey = String(body.idempotencyKey || req.headers.get("idempotency-key") || "");
    const result = await CardServiceEngine.getInstance().apply({
      cardProductId: String(body.cardProductId || ""),
      customerId: customer.customerId,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      kycTier: customer.kycTier,
      accountNumber: String(body.accountNumber || ""),
      idempotencyKey,
    });
    if (result.success) {
      return agentOk({ application: result.application, code: result.code }, requestId, environment);
    }
    return agentErr(result.code || "CARD_APPLICATION_FAILED", result.message || "The card application could not be submitted.", requestId, 400);
  });
}
