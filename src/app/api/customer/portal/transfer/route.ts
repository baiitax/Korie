import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { TransactionService } from "@/lib/services/TransactionService";
import { customerScopeFromRequest } from "@/lib/customer/customerScope";
import { toCustomerTransaction } from "@/lib/customer/CustomerTransactionQuery";
import { CustomerCurrency } from "@/types/customer";

/**
 * POST /api/customer/portal/transfer
 *
 * Executes a customer transfer through the REAL engine path:
 *   double-entry ledger post -> provider adapter dispatch -> outbox event.
 *
 * Amounts in from the client are WHOLE currency units; the engine service uses
 * minor units, so we convert before dispatch (and map the authoritative
 * response back to whole units for display). The response status is whatever
 * the engine/provider returned — never fabricated client-side.
 *
 * Auth + scope required; a generated/received idempotency key is forwarded so
 * the server can deduplicate (see BANKING_INTEGRATION_PLAN.md for the DB guard).
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["transfers:write", "payments:write"]);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: auth.errorMessage || "Unauthorized",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { context } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({
      code: "INVALID_BODY",
      message: "Malformed request body.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 400,
    });
  }

  const amount = Number(body.amount);
  const currency = String(body.currency) as CustomerCurrency;
  const reference = String(body.reference || `KP-2026-TX-${Date.now()}`);
  const destinationCurrency = body.destinationCurrency as CustomerCurrency | undefined;
  const isCrossBorder = Boolean(body.isCrossBorder) || Boolean(destinationCurrency && destinationCurrency !== currency);
  // Identity comes from the SAME resolver every customer route uses. This route
  // previously carried its own `resolveCustomerId()`, which guessed
  // `cust-<userId>` from the subject and silently fell back to the demo
  // customer when it could not — i.e. a second, weaker copy of the ownership
  // rule on the only route that moves money.
  const scope = customerScopeFromRequest(req, context);
  if (!scope.ok || !scope.ownerCustomerId) {
    return createErrorResponse({
      code: "CUSTOMER_IDENTITY_UNRESOLVED",
      message: "We could not resolve your profile for this session, so nothing was sent.",
      httpStatus: 403,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }
  const sourceCustomerId = scope.ownerCustomerId;

  if (!Number.isFinite(amount) || amount <= 0) {
    return createErrorResponse({
      code: "INVALID_AMOUNT",
      message: "Amount must be a positive number.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 400,
    });
  }

  // The engine service uses minor units.
  const minorUnitAmount = Math.round(amount * 100);

  try {
    // XOF -> XOF domestic transfer is NOT yet backed by the transfer engine
    // (in-sandbox the engine supports NGN NIP + the NGN<->XOF cross-border
    // corridor via Coris Bank). Return a controlled, honest response rather
    // than fabricating a success. Coris Bank / GIM-UEMOA domestic routing is
    // documented in BANKING_INTEGRATION_PLAN.md.
    if (currency === "XOF" && destinationCurrency === "XOF") {
      return createErrorResponse({
        code: "XOF_DOMESTIC_NOT_YET_AVAILABLE",
        message: "Same-currency XOF transfers are coming soon through Coris Bank. You can currently transfer within the NGN<->XOF corridor.",
        requestId: `KP-REQ-${Date.now()}`,
        httpStatus: 400,
      });
    }

    if (isCrossBorder) {
      const tx = await TransactionService.executeCrossBorderTransfer(context, {
        sourceCurrency: currency as "NGN" | "XOF",
        destinationCurrency: (destinationCurrency || "XOF") as "NGN" | "XOF",
        amount: minorUnitAmount,
        reference,
        recipient: {
          name: String(body.recipientName || "Recipient"),
          bankCode: String(body.recipientBankCode || "NE024"),
          accountNumber: String(body.recipientAccount || ""),
          phone: body.recipientPhone,
        },
        narration: body.description,
        sourceCustomerId,
      });
      return createSuccessResponse(
        { transaction: toCustomerTransaction(tx) },
        { requestId: context.requestId, correlationId: context.correlationId, environment: context.environment },
      );
    }

    const tx = await TransactionService.executeNipOutward(context, {
      destinationBankCode: String(body.recipientBankCode || "058"),
      destinationAccountNumber: String(body.recipientAccount || ""),
      beneficiaryName: String(body.recipientName || "Recipient"),
      amount: minorUnitAmount,
      reference,
      narration: body.description,
      sourceCustomerId,
    });
    return createSuccessResponse(
      { transaction: toCustomerTransaction(tx) },
      { requestId: context.requestId, correlationId: context.correlationId, environment: context.environment },
    );
  } catch (error: any) {
    return createErrorResponse({
      code: "TRANSFER_FAILED",
      message: error?.message || "Transfer could not be completed.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 400,
    });
  }
}

