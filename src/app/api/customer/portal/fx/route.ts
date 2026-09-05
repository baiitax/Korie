import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { TransactionService } from "@/lib/services/TransactionService";

/**
 * GET /api/customer/portal/fx
 *
 * Returns the cross-border execution rates the transfer engine actually applies
 * (single source of truth), so the customer is never shown a quote that differs
 * from the rate executed. No invented buys/sells/spreads — the engine applies a
 * single rate per direction.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["fx:read", "payments:read"]);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: auth.errorMessage || "Unauthorized",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { context } = auth;

  const quotes = [
    TransactionService.getCrossBorderRate("NGN"),
    TransactionService.getCrossBorderRate("XOF"),
  ].map((q) => ({
    fromCurrency: q.sourceCurrency,
    toCurrency: q.destinationCurrency,
    rate: q.rate,
    source: "KoriePay Bilateral Sahel Engine",
  }));

  return createSuccessResponse(
    { quotes },
    {
      requestId: context.requestId,
      correlationId: context.correlationId,
      environment: context.environment,
    },
  );
}
