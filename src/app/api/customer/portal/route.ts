import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { CustomerLifecycleEngine } from "@/lib/customer/CustomerLifecycleEngine";
import { AccountLifecycleEngine } from "@/lib/customer/AccountLifecycleEngine";
import { BeneficiarySecurityEngine } from "@/lib/customer/BeneficiarySecurityEngine";
import {
  engineToUser,
  engineToWallet,
  engineToBeneficiary,
} from "@/lib/engineAdapters";
import { TransactionService } from "@/lib/services/TransactionService";
import { customerScopeFromRequest } from "@/lib/customer/customerScope";
import { openDisputeRefsFor, withDisputeState } from "@/lib/customer/disputeStatus";
import { orderCurrenciesXofFirst } from "@/lib/customer/customerFeatures";
import { queryCustomerTransactions } from "@/lib/customer/CustomerTransactionQuery";

/**
 * GET /api/customer/portal
 *
 * Single aggregated payload the customer shell hydrates from, so pages do not
 * each invent their own data path.
 *
 * WHAT IS AUTHORITATIVE HERE
 *   • customer identity  ← CustomerLifecycleEngine, resolved from the auth
 *     context (never from a client-supplied id).
 *   • wallet balances    ← AccountLifecycleEngine (+ subledger sync), ordered
 *     XOF first, NGN second. No USD is ever emitted.
 *   • beneficiaries      ← BeneficiarySecurityEngine, scoped to the owner.
 *   • transaction summary ← CustomerTransactionQuery over the engine's owned
 *     rows. Same ownership rule as /transactions, same projection.
 *   • fx rates           ← TransactionService, the rate actually executed.
 *
 * WHAT THIS ROUTE NO LONGER DOES
 *   It used to return a hardcoded catalog (`CUSTOMER_TRANSACTIONS`) as if it
 *   were the customer's history, and to invent a `fallbackUser(...)` identity
 *   whenever resolution failed. Both are gone. A customer with no executed
 *   transactions now receives `transactions: []`, `totalCount: 0` — which is
 *   the truth, and which the portal renders as an empty state rather than a
 *   fabricated statement.
 *
 * `supportTickets` is always empty here. It used to carry
 * `CUSTOMER_SUPPORT_TICKETS`, a fixture array rendered as if it were the
 * customer's live cases. There is no customer-scoped ticket engine behind that
 * shape (the internal `SupportTicket` type has fields — `lastReplyBy` among
 * them — that nothing in the system can populate), so the field is served empty
 * rather than filled with invented rows. Cases the customer actually opened are
 * real `ComplaintRecord`s and are read from /api/customer/portal/disputes.
 */
export const dynamic = "force-dynamic";

/** Rows the shell needs immediately; the history screen pages through more. */
const DASHBOARD_WINDOW = 5;

export async function GET(req: NextRequest) {
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
      message:
        "We could not resolve your banking profile for this session. Please sign in again or contact support.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 403,
    });
  }

  const ownerCustomerId = scope.ownerCustomerId;

  const customerEngine = CustomerLifecycleEngine.getInstance();
  const accountEngine = AccountLifecycleEngine.getInstance();
  const beneficiaryEngine = BeneficiarySecurityEngine.getInstance();

  const customerRecord = customerEngine.getCustomer(ownerCustomerId);
  const accounts = accountEngine.getAccounts(ownerCustomerId);
  const beneficiaryRecords = beneficiaryEngine.getBeneficiaries(ownerCustomerId);

  // Owned transactions via the authoritative query — never a catalog.
  const owned = TransactionService.listRawForOwner(ownerCustomerId);
  const history = queryCustomerTransactions(owned, { limit: DASHBOARD_WINDOW });
  const recentActivity = withDisputeState(
    history.items,
    openDisputeRefsFor(ownerCustomerId),
  );

  // Cross-border execution rates from the transfer engine (single source of
  // truth) — the customer quote must match the rate that will be executed.
  const fxRates = [
    TransactionService.getCrossBorderRate("NGN"),
    TransactionService.getCrossBorderRate("XOF"),
  ].map((q) => ({
    fromCurrency: q.sourceCurrency,
    toCurrency: q.destinationCurrency,
    rate: q.rate,
    source: "KoriePay Bilateral Sahel Engine",
  }));

  return createSuccessResponse(
    {
      portal: {
        // `null` is honest: no record for this identity means no profile, and
        // the client must not paint a made-up customer.
        customer: customerRecord ? engineToUser(customerRecord) : null,
        // XOF first, NGN second (Niger-first). No customer-visible USD.
        wallets: accounts.length > 0 ? orderCurrenciesXofFirst(accounts.map(engineToWallet)) : [],
        beneficiaries: beneficiaryRecords.map(engineToBeneficiary),
        transactions: recentActivity,
        transactionSummary: {
          totalCount: history.totalCount,
          window: DASHBOARD_WINDOW,
          generatedAt: history.generatedAt,
        },
        // Cards are COMING SOON — do not expose fabricated card records.
        cards: [],
        supportTickets: [],
        fxRates,
      },
    },
    {
      requestId: auth.context.requestId,
      correlationId: auth.context.correlationId,
      environment: auth.context.environment,
    },
  );
}
