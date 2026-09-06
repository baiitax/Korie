import { NextRequest } from "next/server";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { getFxRates } from "@/lib/customer/customerData";

/**
 * GET /api/customer/portal/fx
 *
 * Returns the administered NGN<->XOF rates from public.fx_rates — the exact
 * table the transfer route reads when executing a cross-border transfer, so
 * the customer is never shown a quote that differs from the rate executed.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: auth.errorMessage || "Unauthorized",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const rates = await getFxRates();
  const quotes = rates.map((r) => ({ ...r, source: "KoriePay Administered Rate" }));

  return createSuccessResponse(
    { quotes },
    { requestId: auth.customer.requestId, environment: "PRODUCTION" },
  );
}
