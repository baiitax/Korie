// =============================================================================
// Shared auth/scope plumbing for the customer Adashi BFF routes.
// (Underscore-prefixed folder/segment files are not route handlers.)
// =============================================================================

import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { customerScopeFromRequest } from "@/lib/customer/customerScope";

export type AuthedHandler = (ctx: {
  customerId: string;
  requestId: string;
  environment?: 'SANDBOX' | 'PRODUCTION';
}) => Promise<Response>;

export async function withCustomerAuth(req: NextRequest, scopes: string[], handler: AuthedHandler): Promise<Response> {
  const auth = await authenticateApiRequest(req, scopes);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: "We could not confirm who you are. Please sign in again.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }
  const scope = customerScopeFromRequest(req, auth.context);
  if (!scope.ok || !scope.ownerCustomerId) {
    return createErrorResponse({
      code: "CUSTOMER_IDENTITY_UNRESOLVED",
      message: "We could not resolve your profile for this session.",
      httpStatus: 403,
      requestId: auth.context.requestId,
    });
  }
  try {
    return await handler({
      customerId: scope.ownerCustomerId,
      requestId: auth.context.requestId || `KP-REQ-${Date.now()}`,
      environment: auth.context.environment,
    });
  } catch (error: any) {
    return createErrorResponse({
      code: "ADASHI_OPERATION_FAILED",
      message: error?.message || "The operation could not be completed.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 400,
    });
  }
}

export function okResponse(data: unknown, requestId: string, environment?: 'SANDBOX' | 'PRODUCTION') {
  return createSuccessResponse(data as Record<string, unknown>, { requestId, environment });
}

export function badResponse(code: string, message: string, requestId: string, httpStatus = 400) {
  return createErrorResponse({ code, message, requestId: `KP-REQ-${Date.now()}`, httpStatus });
}
