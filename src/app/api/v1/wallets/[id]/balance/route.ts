import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/v1/wallets/:id/balance
 *
 * Returns the authoritative wallet balance read from the database of record.
 * The wallet row and its linked ledger account are now kept in lockstep by
 * database triggers (migration 20260914000050), so `wallets.balance` IS the
 * ledger-backed balance — enforced to equal the journal-derived balance of
 * the linked ledger account at every commit.
 *
 * Previous iterations of this route returned fabricated numbers: first a
 * hardcoded balance, then balances from an in-memory "subledger engine"
 * seeded with demo customers. This version reads the real wallet by UUID or
 * account number and reports its actual balance, locked balance, available
 * balance and real ledger account reference.
 *
 * Auth + scope are required; a missing/unknown wallet returns 404.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return createErrorResponse({
      code: "BACKEND_NOT_CONFIGURED",
      message: "Wallet service is not configured.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 503,
    });
  }

  // Resolve the wallet by UUID, or by its account number (the customer-facing
  // wallet reference). Both come straight from the database of record.
  //
  // NOTE (open finding, not fixed here): customer wallets carry org_id set
  // to one of the two KoriePay platform tenant orgs, not the calling
  // merchant/aggregator's own org — there is no merchant_id/aggregator_id
  // column on `wallets` linking a wallet to a specific external tenant. So a
  // same-org check against `context.orgId` cannot be applied without first
  // deciding the real authorization model this endpoint is supposed to
  // enforce (e.g. "may only look up a wallet the caller has an active
  // transaction/consent relationship with"), which is a product decision,
  // not a mechanical fix — flagged for a follow-up pass rather than guessed
  // at here to avoid silently breaking every legitimate caller.
  let query = admin
    .from("wallets")
    .select("id, account_number, currency, balance, locked_balance, status, updated_at, ledger_accounts(account_number)");
  query = UUID_RE.test(id) ? query.eq("id", id) : query.eq("account_number", id);

  const { data: wallet, error } = await query.maybeSingle();
  if (error || !wallet) {
    return createErrorResponse({
      code: "WALLET_NOT_FOUND",
      message: "Wallet not found.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 404,
    });
  }

  const balance = Number(wallet.balance ?? 0);
  const locked = Number(wallet.locked_balance ?? 0);
  const available = Math.max(balance - locked, 0);
  const currency = wallet.currency;
  // PostgREST embeds the many-to-one ledger account as a single object.
  const ledger = wallet.ledger_accounts as { account_number?: string } | null | undefined;
  const ledgerAccount = ledger?.account_number ?? null;

  return createSuccessResponse(
    {
      wallet_id: wallet.id,
      wallet_account_number: wallet.account_number ?? null,
      currency,
      balance,
      locked_balance: locked,
      available_balance: available,
      formatted_available: formatMoneySafe(available, currency),
      ledger_account_reference: ledgerAccount,
      status: wallet.status,
      updated_at: wallet.updated_at,
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
