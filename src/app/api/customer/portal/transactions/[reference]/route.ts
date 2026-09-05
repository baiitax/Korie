import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { TransactionService } from "@/lib/services/TransactionService";
import { customerScopeFromRequest } from "@/lib/customer/customerScope";
import { decorateDetail, openDisputeRefsFor } from "@/lib/customer/disputeStatus";
import {
  fromMinorUnits,
  maskAccountNumber,
  toCustomerTransaction,
} from "@/lib/customer/CustomerTransactionQuery";
import { CustomerCurrency } from "@/types/customer";

/**
 * GET /api/customer/portal/transactions/[reference]
 *
 * Real transaction detail (customer portal brief §14): status, amount,
 * currency, sender, recipient, reference, date/time, fee, FX rate where
 * relevant, the customer's own account, and the transaction type.
 *
 * Ownership: the row is looked up *within the caller's own scope*. A reference
 * that exists but belongs to someone else and a reference that does not exist
 * produce the same 404 — so the endpoint cannot be used to enumerate other
 * customers' activity.
 *
 * The response is a hand-built customer projection. It never spreads the engine
 * row, which means internal fields (ledger_transaction_id, org_id,
 * request/correlation ids, idempotency key, provider code/reference/response
 * code, raw metadata) cannot leak by accident if the engine record grows.
 */
export const dynamic = "force-dynamic";

const NOT_FOUND = {
  code: "TRANSACTION_NOT_FOUND",
  message:
    "We couldn't find that transaction on your account. It may have been recorded under a different account.",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { reference: string } },
) {
  const auth = await authenticateApiRequest(req, ["payments:read"]);
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
      message: "We could not resolve your banking profile for this session.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 403,
    });
  }

  const reference = decodeURIComponent(params.reference || "").trim();
  if (!reference || reference.length > 64) {
    return createErrorResponse({ ...NOT_FOUND, requestId: `KP-REQ-${Date.now()}` });
  }

  const tx = TransactionService.findRawForOwner(reference, scope.ownerCustomerId);
  if (!tx) {
    return createErrorResponse({ ...NOT_FOUND, httpStatus: 404, requestId: `KP-REQ-${Date.now()}` });
  }

  // Dispute state is joined at read time, never written to the ledger.
  const ui = decorateDetail(
    toCustomerTransaction(tx),
    openDisputeRefsFor(scope.ownerCustomerId),
  );
  const currency = (tx.currency as CustomerCurrency) || "NGN";

  return createSuccessResponse(
    {
      transaction: ui,
      detail: {
        reference: tx.reference,
        type: tx.type,
        status: ui.status,
        amountMinor: tx.amount,
        amountMajor: fromMinorUnits(tx.amount, currency),
        feeMajor: fromMinorUnits(tx.fee, currency),
        currency,
        direction: "OUTWARD",
        initiatedAt: tx.created_at,
        lastUpdatedAt: tx.updated_at,
        sender: {
          name: "KoriePay customer",
          account: undefined,
        },
        recipient: {
          name: tx.recipient_name,
          institution: tx.recipient_bank,
          maskedAccount: maskAccountNumber(tx.recipient_account),
        },
        sourceCurrency: tx.source_currency as CustomerCurrency | undefined,
        destinationCurrency: tx.destination_currency as CustomerCurrency | undefined,
        exchangeRate: tx.exchange_rate,
        destinationAmountMajor:
          tx.metadata?.destAmount != null
            ? fromMinorUnits(
                Number(tx.metadata.destAmount),
                (tx.destination_currency as CustomerCurrency) || "XOF",
              )
            : undefined,
      },
    },
    {
      requestId: auth.context.requestId,
      correlationId: auth.context.correlationId,
      environment: auth.context.environment,
    },
  );
}
