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
 * Auth + scope are required; a caller may only ever resolve a wallet that
 * belongs to its own tenant org (`wallets.org_id = context.orgId`, the same
 * invariant enforced by the `wallets_tenant_isolation` RLS policy on this
 * table — re-applied here explicitly because this route runs on the
 * service-role admin client, which bypasses RLS). A wallet belonging to a
 * different org, or a missing/unknown wallet, both return 404 (not 403) so
 * the response never confirms or denies whether a given id/account number
 * exists for another tenant.
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
  // wallet reference) — SCOPED TO THE CALLING TENANT'S OWN ORG.
  //
  // FIXED (was an open finding / live cross-tenant IDOR): this route used
  // to look up any wallet by id/account_number with no ownership check at
  // all. Because it runs on the service-role admin client (which bypasses
  // the wallets_tenant_isolation RLS policy that protects this same table
  // everywhere else), any caller holding a valid merchant or aggregator API
  // key — regardless of which org issued it — could read any customer's
  // real wallet balance simply by guessing or enumerating a wallet UUID or
  // account number. That is a live PII/financial-data leak across tenants,
  // not merely a theoretical gap.
  //
  // The fix re-applies the same invariant the database's own RLS policy
  // enforces (`wallets.org_id = caller's org_id`) in application code,
  // since the admin client does not get that enforcement for free. A
  // caller can now only ever retrieve a wallet that belongs to its own
  // org_id. Today no merchant or aggregator org has any real wallets
  // provisioned under it (wallets only exist for KoriePay's own customer
  // book), so this correctly returns 404 for every external API caller
  // until a real merchant/aggregator-owned wallet product exists — that is
  // the honest state of the feature, not a regression.
  let query = admin
    .from("wallets")
    .select("id, account_number, currency, balance, locked_balance, status, updated_at, org_id, ledger_accounts(account_number)")
    .eq("org_id", context.orgId);
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
