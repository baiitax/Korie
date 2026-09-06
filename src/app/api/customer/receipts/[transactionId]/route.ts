import { NextRequest } from "next/server";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { buildReceiptData } from "@/lib/receipt";
import { getTransactionByReferenceForCustomer, getOpenDisputeReferencesForCustomer, transactionRowToCustomerTransaction, getCustomerById, customerRowToUser } from "@/lib/customer/customerData";

/**
 * GET /api/customer/receipts/:transactionId
 *
 * Real, ownership-enforced receipt endpoint. The authenticated customer's
 * identity comes only from `authenticateCustomerRequest` (a validated
 * Supabase session); the transaction is looked up by reference AND
 * `customer_id = <authenticated customer>` directly in Postgres — a
 * transaction that does not exist and one that belongs to someone else both
 * answer 404, so this endpoint cannot be used to enumerate other customers'
 * activity.
 */
export async function GET(req: NextRequest, { params }: { params: { transactionId: string } }) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: auth.errorMessage || "Unauthorized",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const reference = decodeURIComponent(params.transactionId || "").trim();
  if (!reference || reference.length > 64) {
    return createErrorResponse({ code: "TRANSACTION_NOT_FOUND", message: "Transaction not found or you do not have access to it.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 404 });
  }

  const tx = await getTransactionByReferenceForCustomer(reference, auth.customer.customerId);
  if (!tx) {
    return createErrorResponse({ code: "TRANSACTION_NOT_FOUND", message: "Transaction not found or you do not have access to it.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 404 });
  }

  const [disputedRefs, customerRow] = await Promise.all([
    getOpenDisputeReferencesForCustomer(auth.customer.customerId),
    getCustomerById(auth.customer.customerId),
  ]);
  const customerTx = transactionRowToCustomerTransaction(tx, disputedRefs.has(tx.reference));
  const customerUser = customerRow ? customerRowToUser(customerRow) : undefined;

  const receipt = buildReceiptData(customerTx, customerUser);

  return createSuccessResponse(
    { transaction: customerTx.reference, receipt },
    { requestId: auth.customer.requestId, environment: "PRODUCTION" },
  );
}
