import { NextRequest } from "next/server";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import {
  getTransactionByReferenceForCustomer,
  getOpenDisputeReferencesForCustomer,
  transactionRowToCustomerTransaction,
} from "@/lib/customer/customerData";
import { CustomerCurrency } from "@/types/customer";

/**
 * GET /api/customer/portal/transactions/[reference]
 *
 * Real transaction detail, read directly from public.customer_transactions,
 * scoped to `customer_id = <authenticated customer>`. A reference that
 * belongs to someone else or does not exist both answer 404 — this endpoint
 * can never be used to enumerate another customer's activity.
 */
export const dynamic = "force-dynamic";

const NOT_FOUND = {
  code: "TRANSACTION_NOT_FOUND",
  message: "We couldn't find that transaction on your account.",
};

function maskAccountNumber(account?: string | null): string | undefined {
  if (!account) return undefined;
  const clean = account.replace(/\s+/g, "");
  if (clean.length <= 4) return "••••";
  return `•••• ${clean.slice(-4)}`;
}

export async function GET(req: NextRequest, { params }: { params: { reference: string } }) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: "We could not confirm who you are. Please sign in again.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const reference = decodeURIComponent(params.reference || "").trim();
  if (!reference || reference.length > 64) {
    return createErrorResponse({ ...NOT_FOUND, requestId: `KP-REQ-${Date.now()}`, httpStatus: 404 });
  }

  const tx = await getTransactionByReferenceForCustomer(reference, auth.customer.customerId);
  if (!tx) {
    return createErrorResponse({ ...NOT_FOUND, httpStatus: 404, requestId: `KP-REQ-${Date.now()}` });
  }

  const disputedRefs = await getOpenDisputeReferencesForCustomer(auth.customer.customerId);
  const ui = transactionRowToCustomerTransaction(tx, disputedRefs.has(tx.reference));
  const currency = tx.currency as CustomerCurrency;

  return createSuccessResponse(
    {
      transaction: ui,
      detail: {
        reference: tx.reference,
        type: tx.transaction_type,
        status: ui.status,
        amountMajor: Number(tx.amount),
        feeMajor: Number(tx.fee),
        currency,
        direction: "OUTWARD",
        initiatedAt: tx.created_at,
        lastUpdatedAt: tx.completed_at || tx.created_at,
        sender: { name: "KoriePay customer", account: undefined },
        recipient: {
          name: tx.recipient_name,
          institution: tx.recipient_bank,
          maskedAccount: maskAccountNumber(tx.recipient_account),
        },
        sourceCurrency: currency,
        destinationCurrency: (tx.destination_currency as CustomerCurrency) || undefined,
        exchangeRate: tx.exchange_rate != null ? Number(tx.exchange_rate) : undefined,
        destinationAmountMajor: tx.destination_amount != null ? Number(tx.destination_amount) : undefined,
        providerName: tx.provider_name,
        providerStatus: tx.provider_status,
      },
    },
    { requestId: auth.customer.requestId, environment: "PRODUCTION" },
  );
}
