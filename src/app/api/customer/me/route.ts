import { NextRequest } from "next/server";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { getCustomerById, customerRowToUser } from "@/lib/customer/customerData";

/**
 * GET /api/customer/me
 *
 * Minimal identity endpoint used right after a real Supabase sign-in to
 * populate the session shell (name, KYC tier, country) without pulling the
 * full wallets/transactions/beneficiaries aggregate that `/api/customer/portal`
 * returns. Identity comes only from the validated Bearer token.
 */
export const dynamic = "force-dynamic";

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

  const row = await getCustomerById(auth.customer.customerId);
  if (!row) {
    return createErrorResponse({ code: "CUSTOMER_NOT_FOUND", message: "Customer profile not found.", requestId: auth.customer.requestId, httpStatus: 404 });
  }

  return createSuccessResponse({ customer: customerRowToUser(row) }, { requestId: auth.customer.requestId, environment: "PRODUCTION" });
}
