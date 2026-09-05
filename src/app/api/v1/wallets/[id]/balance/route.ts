import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { AccountLifecycleEngine } from "@/lib/customer/AccountLifecycleEngine";
import { SubledgerEngine } from "@/lib/financial/SubledgerEngine";

/**
 * GET /api/v1/wallets/:id/balance
 *
 * Returns the authoritative wallet balance, synchronised from the general
 * ledger subledger. Previously this route hardcoded a fabricated balance
 * (`balance: 85000000`, `formatted_available: '₦845,000.00'`) regardless of
 * the wallet — a fake financial value. It now resolves the account by id or
 * account number and reads `availableBalance`/`ledgerBalance`/`heldBalance`
 * from the subledger engine (the same source `AccountLifecycleEngine` uses).
 *
 * Auth + scope are still required; a missing/unknown wallet returns 404.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await authenticateApiRequest(req, ["wallets:read"]);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: auth.errorMessage || "Unauthorized",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { context } = auth;
  const { id } = params;

  // Resolve the account and its authoritative subledger-backed balance.
  const accountEngine = AccountLifecycleEngine.getInstance();
  const account = accountEngine.getAccount(id);

  if (!account) {
    return createErrorResponse({
      code: "WALLET_NOT_FOUND",
      message: "Wallet not found.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 404,
    });
  }

  const subledger = SubledgerEngine.getInstance().getSubledger("CUSTOMER_WALLET", account.customerId, account.currency);
  const available = subledger?.availableBalance ?? account.availableBalance;
  const ledger = subledger?.currentBalance ?? account.ledgerBalance;
  const held = subledger?.heldBalance ?? account.heldBalance;

  // No fabricated numbers: derive the currency and ledger reference from the
  // record, not from guessing based on the id containing 'xof'.
  const currency = account.currency;
  const ledgerRef = `2010-CUST-WALLETS-${currency}`;

  return createSuccessResponse(
    {
      wallet_id: account.id,
      currency,
      balance: ledger,
      locked_balance: held,
      available_balance: available,
      formatted_available: formatMoneySafe(available, currency),
      ledger_account_reference: ledgerRef,
      status: account.status,
      updated_at: account.updatedAt,
    },
    {
      requestId: context.requestId,
      correlationId: context.correlationId,
      environment: context.environment,
    },
  );
}

/** Currency-aware formatting without introducing a false precision claim. */
function formatMoneySafe(amount: number, currency: string): string {
  if (currency === "XOF") return `CFA ${Math.round(amount).toLocaleString("en-US")}`;
  const symbol = currency === "NGN" ? "₦" : "$";
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
