import { NextRequest } from "next/server";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import {
  getCustomerById,
  getWalletsForCustomer,
  getTransactionsForCustomer,
  getBeneficiariesForCustomer,
  customerRowToUser,
  walletRowToWallet,
  beneficiaryRowToBeneficiary,
} from "@/lib/customer/customerData";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/customer/360
 *
 * Customer 360° profile, real-DB backed. Identity is resolved ONLY from the
 * authenticated Supabase session (never a client-supplied `id`); a request
 * for a different id than the caller's own is rejected outright, and a
 * request for the caller's own id (the normal case) is served from
 * `customers` / `wallets` / `customer_transactions` / `customer_beneficiaries`
 * / `customer_disputes` directly.
 */
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
  const { customer: authedCustomer } = auth;

  const requestedId = req.nextUrl.searchParams.get("id");
  if (requestedId && requestedId !== authedCustomer.customerId) {
    return createErrorResponse({
      code: "FORBIDDEN",
      message: "You do not have access to this customer profile.",
      requestId: authedCustomer.requestId,
      httpStatus: 403,
    });
  }

  const customerId = authedCustomer.customerId;

  try {
    const admin = getSupabaseAdminClient();
    const [customerRow, wallets, transactions, beneficiaryRows, disputesResult] = await Promise.all([
      getCustomerById(customerId),
      getWalletsForCustomer(customerId),
      getTransactionsForCustomer(customerId, { limit: 200 }),
      getBeneficiariesForCustomer(customerId),
      admin
        .from("customer_disputes")
        .select("id, ticket_number, status, priority, category, disputed_amount, currency, description, created_at, resolved_at, transaction_reference")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
    ]);

    if (!customerRow) {
      return createErrorResponse({ code: "CUSTOMER_NOT_FOUND", message: "Customer not found.", requestId: authedCustomer.requestId, httpStatus: 404 });
    }

    const disputes = disputesResult.data || [];
    const openDisputes = disputes.filter((d) => d.status === "OPEN" || d.status === "IN_PROGRESS");

    return createSuccessResponse(
      {
        customer: customerRowToUser(customerRow),
        wallets: wallets.map(walletRowToWallet),
        beneficiaries: beneficiaryRows.map(beneficiaryRowToBeneficiary),
        complaints: disputes.map((d) => ({
          id: d.id,
          ticketNumber: d.ticket_number,
          status: d.status,
          priority: d.priority,
          category: d.category,
          disputedAmount: d.disputed_amount != null ? Number(d.disputed_amount) : undefined,
          currency: d.currency,
          description: d.description,
          createdAt: d.created_at,
          resolvedAt: d.resolved_at,
          transactionReference: d.transaction_reference,
        })),
        summary: {
          totalWallets: wallets.length,
          totalBeneficiaries: beneficiaryRows.length,
          openComplaints: openDisputes.length,
          totalTransactions: transactions.length,
        },
      },
      { requestId: authedCustomer.requestId, environment: "PRODUCTION" },
    );
  } catch (error: any) {
    return createErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Could not load the customer profile.",
      requestId: authedCustomer.requestId,
      httpStatus: 500,
      details: [{ code: "CUSTOMER_LOAD_ERROR", field: "error", message: String(error?.message ?? "Unknown error") }],
    });
  }
}
