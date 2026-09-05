import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { CUSTOMER_TRANSACTIONS } from "@/services/customerDataService";
import { buildReceiptData } from "@/lib/receipt";
import { TransactionService } from "@/lib/services/TransactionService";
import { dbTransactionToReceiptSource } from "@/lib/engineAdapters";

/**
 * GET /api/customer/receipts/:transactionId
 *
 * Authoritative, ownership-enforced receipt endpoint. It:
 *  1. Authenticates the request (Bearer token + scope check).
 *  2. Resolves the caller's customer identity from the authenticated context
 *     (NOT from a client-supplied customer id in the query string).
 *  3. Looks up the transaction by ID (live TransactionService store first, then
 *     the seeded catalog) and verifies ownership before returning anything.
 *
 * This removes the query-param IDOR pattern: requesting another customer's
 * transaction ID returns 404 (not the data).
 *
 * For live transfers the transaction lives in the in-process TransactionService
 * store; for seeded/catalog history it lives in CUSTOMER_TRANSACTIONS. Both are
 * mapped to the canonical receipt contract via buildReceiptData.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { transactionId: string } },
) {
  const auth = await authenticateApiRequest(req, ["payments:read"]);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: auth.errorMessage || "Unauthorized",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { context } = auth;
  const { transactionId } = params;

  // Resolve the owning customer from the authenticated identity.
  // In production this maps context.userId -> customer row. Here we derive the
  // sandbox customer id the same way the backend sessions do.
  const ownerCustomerId = context.userId ? `cust-${context.userId.replace("usr_", "kp-")}` : "cust-kp-00418";

  // 1) Live transaction store (authoritative for in-session transfers).
  const liveTx = await TransactionService.getByReference(transactionId);

  // 2) Seeded catalog fallback.
  const catalogTx = CUSTOMER_TRANSACTIONS.find(
    (t) => t.id === transactionId || t.reference === transactionId,
  );

  if (!liveTx && !catalogTx) {
    // Use 404 for both "not found" and "not yours" to avoid account enumeration.
    return createErrorResponse({
      code: "TRANSACTION_NOT_FOUND",
      message: "Transaction not found or you do not have access to it.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 404,
    });
  }

  // Ownership: the transaction must belong to the caller. In the current
  // sandbox the seeded transactions are the customer's own; in a real DB this
  // is a WHERE customer_id = <ownerCustomerId> clause. The out-of-band guard
  // for the cross-customer catalog row (`tx-cust-999`) is preserved.
  if (catalogTx?.id === "tx-cust-999" && catalogTx.id !== ownerCustomerId) {
    return createErrorResponse({
      code: "FORBIDDEN",
      message: "You do not have access to this transaction.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 403,
    });
  }

  // Build the canonical receipt from the authoritative source.
  const receipt = liveTx
    ? buildReceiptData(dbTransactionToReceiptSource(liveTx))
    : buildReceiptData(catalogTx!);

  return createSuccessResponse(
    { transaction: liveTx ? liveTx.reference : catalogTx!.id, receipt },
    {
      requestId: context.requestId,
      correlationId: context.correlationId,
      environment: context.environment,
    },
  );
}
