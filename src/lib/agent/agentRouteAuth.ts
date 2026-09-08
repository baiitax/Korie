// =============================================================================
// Shared auth/scope plumbing for the agent kiosk BFF routes
// (/api/agent/*). Agent analogue of the customer-portal helpers.
// =============================================================================

import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { agentScopeFromRequest } from "@/lib/agent/agentScope";

export type AuthedAgentHandler = (ctx: {
  agentId: string;
  requestId: string;
  environment?: "SANDBOX" | "PRODUCTION";
}) => Promise<Response>;

export async function withAgentAuth(
  req: NextRequest,
  scopes: string[],
  handler: AuthedAgentHandler,
): Promise<Response> {
  const auth = await authenticateApiRequest(req, scopes);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: "We could not confirm who you are. Please sign in again.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }
  const scope = agentScopeFromRequest(req, auth.context);
  if (!scope.ok || !scope.ownerAgentId) {
    return createErrorResponse({
      code: "AGENT_IDENTITY_UNRESOLVED",
      message: "We could not resolve your agency profile for this session.",
      httpStatus: 403,
      requestId: auth.context.requestId,
    });
  }
  try {
    return await handler({
      agentId: scope.ownerAgentId,
      requestId: auth.context.requestId || `KP-REQ-${Date.now()}`,
      environment: auth.context.environment,
    });
  } catch (error: any) {
    return createErrorResponse({
      code: "AGENT_OPERATION_FAILED",
      message: error?.message || "The operation could not be completed.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 400,
    });
  }
}

export function agentOk(data: unknown, requestId: string, environment?: "SANDBOX" | "PRODUCTION") {
  return createSuccessResponse(data as Record<string, unknown>, { requestId, environment });
}

export function agentErr(
  code: string,
  message: string,
  requestId: string,
  httpStatus = 400,
) {
  return createErrorResponse({ code, message, requestId: `KP-REQ-${Date.now()}`, httpStatus });
}
