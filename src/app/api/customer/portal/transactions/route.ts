import { NextRequest } from "next/server";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import {
  getTransactionsForCustomer,
  getOpenDisputeReferencesForCustomer,
  transactionRowToCustomerTransaction,
  CustomerTransactionRow,
} from "@/lib/customer/customerData";
import { CustomerCurrency, CustomerTransactionStatus } from "@/types/customer";

/**
 * GET /api/customer/portal/transactions
 *
 * Real, DB-backed transaction history for the authenticated customer only.
 * Filtering/sorting/pagination are done in-process over the customer's own
 * rows (already scoped by `customer_id = auth.uid()`-derived identity at the
 * fetch layer) — never by a client-supplied customerId/accountId.
 */
export const dynamic = "force-dynamic";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

function resolveRangeBounds(range: string | null, now: Date, from?: string | null, to?: string | null) {
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  switch (range) {
    case "TODAY":
      return { startMs: startOfDay(now), endMs: endOfDay(now) };
    case "WEEK": {
      const start = new Date(now);
      const dow = (now.getDay() + 6) % 7;
      start.setDate(now.getDate() - dow);
      return { startMs: startOfDay(start), endMs: endOfDay(now) };
    }
    case "MONTH":
      return { startMs: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), endMs: endOfDay(now) };
    case "CUSTOM": {
      const startMs = from ? new Date(from).getTime() : 0;
      const endMs = to ? endOfDay(new Date(to)) : endOfDay(now);
      if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
      return { startMs, endMs };
    }
    default:
      return null;
  }
}

function matchesSearch(tx: CustomerTransactionRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [tx.reference, tx.recipient_name, tx.recipient_bank, tx.narration]
    .filter(Boolean)
    .some((f) => String(f).toLowerCase().includes(needle));
}

export async function GET(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: "We could not confirm who you are. Please sign in again.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const currency = (sp.get("currency") || "").toUpperCase();
    const status = (sp.get("status") || "").toUpperCase();
    const category = (sp.get("category") || "").toUpperCase();
    const range = sp.get("range");
    const search = sp.get("search");
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(sp.get("limit")) || DEFAULT_PAGE_SIZE));

    const [rows, disputedRefs] = await Promise.all([
      getTransactionsForCustomer(auth.customer.customerId),
      getOpenDisputeReferencesForCustomer(auth.customer.customerId),
    ]);

    const bounds = resolveRangeBounds(range, new Date(), sp.get("from"), sp.get("to"));

    const filtered = rows.filter((tx) => {
      if (currency === "XOF" || currency === "NGN") {
        if (tx.currency !== currency) return false;
      }
      if (category === "FUNDING" && tx.transaction_type !== "WALLET_FUNDING") return false;
      if (category === "TRANSFERS" && tx.transaction_type === "WALLET_FUNDING") return false;
      if (bounds) {
        const t = new Date(tx.created_at).getTime();
        if (t < bounds.startMs || t > bounds.endMs) return false;
      }
      if (search && !matchesSearch(tx, search)) return false;
      return true;
    });

    const items = filtered
      .slice(0, limit)
      .map((tx) => transactionRowToCustomerTransaction(tx, disputedRefs.has(tx.reference)))
      .filter((tx) => !status || tx.status === (status as CustomerTransactionStatus));

    return createSuccessResponse(
      {
        transactions: items,
        pagination: {
          nextCursor: null,
          hasMore: filtered.length > limit,
          totalCount: filtered.length,
          pageSize: limit,
        },
        generatedAt: new Date().toISOString(),
        appliedFilters: {
          currency: (currency as CustomerCurrency) || "ALL",
          category: category || "ALL",
          status: status || "ALL",
          range: range || "ALL",
          search: search || "",
        },
      },
      { requestId: auth.customer.requestId, environment: "PRODUCTION" },
    );
  } catch {
    return createErrorResponse({
      code: "TRANSACTION_HISTORY_UNAVAILABLE",
      message: "Unable to load your transactions. Your account and funds are not affected.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 500,
    });
  }
}
