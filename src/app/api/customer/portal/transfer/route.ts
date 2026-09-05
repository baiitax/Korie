import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { TransactionService } from "@/lib/services/TransactionService";
import { dbTransactionToUi } from "@/lib/engineAdapters";
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
  const sourceCustomerId = resolveCustomerId(context.userId);

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
        { transaction: dbTransactionToUi(tx), engine: { status: tx.status, providerReference: tx.provider_reference } },
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
      { transaction: dbTransactionToUi(tx), engine: { status: tx.status, providerReference: tx.provider_reference } },
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

function resolveCustomerId(userId?: string): string {
  if (userId === "usr_dev_01") return "cust-ng-001-ibrahim";
  if (userId) return `cust-${userId.replace("usr_", "")}`;
  return "cust-ng-001-ibrahim";
}
