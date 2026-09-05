import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { TransactionService } from "@/lib/services/TransactionService";
import { customerScopeFromRequest } from "@/lib/customer/customerScope";
import { openDisputeRefsFor, withDisputeState } from "@/lib/customer/disputeStatus";
import {
  parseTransactionQueryParams,
  queryCustomerTransactions,
} from "@/lib/customer/CustomerTransactionQuery";

/**
 * GET /api/customer/portal/transactions
 *
 * The authoritative customer transaction-history read. Server-side filter,
 * server-side sort, server-side cursor pagination, server-side ownership.
 *
 * Contract guarantees (customer portal brief §8–§11, §16):
 *   • Identity comes from the auth context only. `?customerId=` / `?accountId=`
 *     in the URL are ignored — they can never widen the result set.
 *   • Rows are restricted to `owner_customer_id` written by the engine at
 *     execution time. Cross-customer probes return an empty page, and detail
 *     lookups answer 404, so existence is never leaked.
 *   • No fabricated rows. If the engine has nothing for this customer, the
 *     response is `items: []` with `totalCount: 0` — an honest empty state,
 *     structurally different from an error response.
 *   • Nothing internal is projected: no provider references, no ledger ids,
 *     no idempotency keys, no routing metadata (see CustomerTransactionQuery).
 *
 * Query params: currency | category | status | range | from | to | search |
 *               limit | cursor
 */
export const dynamic = "force-dynamic";

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
        "We could not resolve your banking profile for this session. Please sign in again.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 403,
    });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const filters = parseTransactionQueryParams(sp);
    const owned = TransactionService.listRawForOwner(scope.ownerCustomerId);
    const page = queryCustomerTransactions(owned, filters);
    // A live dispute against a row is part of what the customer must see; the
    // ledger itself is not touched (see src/lib/customer/disputeStatus.ts).
    const items = withDisputeState(page.items, openDisputeRefsFor(scope.ownerCustomerId));

    return createSuccessResponse(
      {
        transactions: items,
        pagination: {
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          totalCount: page.totalCount,
          pageSize: page.pageSize,
        },
        // Server clock = the only truthful source for "Last updated".
        generatedAt: page.generatedAt,
        appliedFilters: {
          currency: filters.currency ?? "ALL",
          category: filters.category ?? "ALL",
          status: filters.status ?? "ALL",
          range: filters.range ?? "ALL",
          search: filters.search ?? "",
        },
      },
      {
        requestId: auth.context.requestId,
        correlationId: auth.context.correlationId,
        environment: auth.context.environment,
      },
    );
  } catch {
    // A failure must be a failure — the client distinguishes this from empty.
    return createErrorResponse({
      code: "TRANSACTION_HISTORY_UNAVAILABLE",
      message:
        "Unable to load your transactions. Your account and funds are not affected.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 500,
    });
  }
}
