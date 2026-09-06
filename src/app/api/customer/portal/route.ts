import { NextRequest } from "next/server";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import {
  getCustomerById,
  getWalletsForCustomer,
  getTransactionsForCustomer,
  getBeneficiariesForCustomer,
  getOpenDisputeReferencesForCustomer,
  getFxRates,
  customerRowToUser,
  walletRowToWallet,
  beneficiaryRowToBeneficiary,
  transactionRowToCustomerTransaction,
  orderWalletsXofFirst,
} from "@/lib/customer/customerData";

/**
 * GET /api/customer/portal
 *
 * Single aggregated payload the customer shell hydrates from. Every value is
 * read straight from the hosted Supabase database via the service-role
 * client, scoped to the REAL authenticated customer (Supabase Auth session
 * -> public.customers.auth_user_id). Nothing here is an in-memory engine or a
 * fixture — a customer with no transactions genuinely gets `transactions: []`.
 */
export const dynamic = "force-dynamic";

const DASHBOARD_WINDOW = 5;

export async function GET(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: auth.errorMessage || "We could not confirm who you are. Please sign in again.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { customer } = auth;

  try {
    const [customerRow, wallets, transactions, beneficiaries, disputedRefs, fxRates] = await Promise.all([
      getCustomerById(customer.customerId),
      getWalletsForCustomer(customer.customerId),
      getTransactionsForCustomer(customer.customerId, { limit: DASHBOARD_WINDOW }),
      getBeneficiariesForCustomer(customer.customerId),
      getOpenDisputeReferencesForCustomer(customer.customerId),
      getFxRates(),
    ]);

    const recentActivity = transactions.map((tx) =>
      transactionRowToCustomerTransaction(tx, disputedRefs.has(tx.reference)),
    );

    return createSuccessResponse(
      {
        portal: {
          customer: customerRow ? customerRowToUser(customerRow) : null,
          wallets: orderWalletsXofFirst(wallets.map(walletRowToWallet)),
          beneficiaries: beneficiaries.map(beneficiaryRowToBeneficiary),
          transactions: recentActivity,
          transactionSummary: {
            totalCount: recentActivity.length,
            window: DASHBOARD_WINDOW,
            generatedAt: new Date().toISOString(),
          },
          // Cards / adashi / bills are COMING SOON — never fabricated records.
          cards: [],
          supportTickets: [],
          fxRates: fxRates.map((r) => ({ ...r, source: "KoriePay Administered Rate" })),
        },
      },
      {
        requestId: customer.requestId,
        environment: "PRODUCTION",
      },
    );
  } catch {
    return createErrorResponse({
      code: "PORTAL_LOAD_FAILED",
      message: "Unable to load your account right now. Your funds and account are not affected.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 500,
    });
  }
}
