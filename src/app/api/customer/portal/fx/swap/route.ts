import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { getWalletsForCustomer, getFxRates } from "@/lib/customer/customerData";
import { getTierLimit } from "@/lib/compliance/tierLimits";

/**
 * POST /api/customer/portal/fx/swap
 *
 * Real, ledger-backed BDC/FX swap between a customer's own NGN and XOF
 * wallets. Previously `/customer/fx` only *simulated* a swap in the
 * browser — this is the first real execution path.
 *
 * Server-enforced, KYC-tier-based volume ceilings (CBN tiered-KYC for NGN,
 * BCEAO Instruction n°008-05-2015 for XOF — see
 * src/lib/compliance/tierLimits.ts) are the actual gate here, applied
 * again inside public.post_customer_fx_swap() so the ceiling can never be
 * bypassed by calling the RPC directly. This executes immediately (status
 * COMPLETED) because both wallets are KoriePay-custodied — there is no
 * external payout rail involved, unlike a bank transfer.
 */
export const dynamic = "force-dynamic";

const SWAP_FEE_PERCENT = 0.5; // platform FX spread/fee, matches the rate shown pre-swap

export async function POST(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: auth.errorMessage || "Unauthorized",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }
  const { customer } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: "INVALID_BODY", message: "Malformed request body.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const fromCurrency = String(body.fromCurrency || "").toUpperCase() as "NGN" | "XOF";
  const toCurrency = String(body.toCurrency || "").toUpperCase() as "NGN" | "XOF";
  const fromAmount = Number(body.fromAmount);

  if (!["NGN", "XOF"].includes(fromCurrency) || !["NGN", "XOF"].includes(toCurrency)) {
    return createErrorResponse({ code: "CURRENCY_UNSUPPORTED", message: "Only NGN and XOF are supported.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }
  if (fromCurrency === toCurrency) {
    return createErrorResponse({ code: "SAME_CURRENCY_SWAP_NOT_ALLOWED", message: "Choose two different currencies to swap between.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }
  if (!Number.isFinite(fromAmount) || fromAmount <= 0) {
    return createErrorResponse({ code: "INVALID_AMOUNT", message: "Amount must be a positive number.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  // Never trust a client-supplied wallet id — resolve the customer's own
  // wallets for both legs server-side.
  const wallets = await getWalletsForCustomer(customer.customerId);
  const fromWallet = wallets.find((w) => w.currency === fromCurrency);
  const toWallet = wallets.find((w) => w.currency === toCurrency);
  if (!fromWallet) {
    return createErrorResponse({ code: "SOURCE_WALLET_NOT_FOUND", message: `You do not have a ${fromCurrency} wallet.`, requestId: `KP-REQ-${Date.now()}`, httpStatus: 404 });
  }
  if (!toWallet) {
    return createErrorResponse({ code: "DESTINATION_WALLET_NOT_FOUND", message: `You do not have a ${toCurrency} wallet.`, requestId: `KP-REQ-${Date.now()}`, httpStatus: 404 });
  }

  // Pre-flight tier check for a clear, specific error message before we
  // even attempt the RPC (the RPC re-checks this itself — belt and braces).
  const tierLimit = getTierLimit(fromCurrency, customer.kycTier || "TIER_0");
  if (tierLimit.volumeLimitMajor === 0) {
    return createErrorResponse({
      code: "TIER_NOT_PERMITTED_TO_SWAP",
      message: "Your verification tier does not permit currency swaps yet. Please complete verification to unlock this.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 403,
    });
  }

  const rates = await getFxRates();
  const match = rates.find((r) => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency);
  if (!match) {
    return createErrorResponse({ code: "FX_RATE_UNAVAILABLE", message: "Exchange rate unavailable for this pair right now.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 409 });
  }

  const fee = Math.round(fromAmount * (SWAP_FEE_PERCENT / 100) * 100) / 100;
  const netPrincipal = fromAmount - fee;
  const toAmount = Math.round(netPrincipal * match.rate * 100) / 100;
  if (toAmount <= 0) {
    return createErrorResponse({ code: "INVALID_AMOUNT", message: "The amount is too small to swap after fees.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const reference = String(body.reference || `KP-${new Date().getFullYear()}-FXS-${randomUUID().split("-")[0].toUpperCase()}`);
  const idempotencyKey = req.headers.get("idempotency-key") || req.headers.get("Idempotency-Key") || `idem-${reference}`;

  const { data, error } = await admin.rpc("post_customer_fx_swap", {
    p_customer_id: customer.customerId,
    p_org_id: customer.orgId,
    p_from_wallet_id: fromWallet.id,
    p_to_wallet_id: toWallet.id,
    p_from_amount: fromAmount,
    p_fee: fee,
    p_exchange_rate: match.rate,
    p_to_amount: toAmount,
    p_idempotency_key: idempotencyKey,
    p_reference: reference,
  });

  if (error) {
    const message = error.message || "";
    if (message.includes("TIER_VOLUME_LIMIT_EXCEEDED")) {
      return createErrorResponse({ code: "TIER_VOLUME_LIMIT_EXCEEDED", message: "This swap would exceed the volume your verification tier is allowed to move in this period. Upgrade your verification tier or try a smaller amount.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 422 });
    }
    if (message.includes("TIER_NOT_PERMITTED_TO_SWAP")) {
      return createErrorResponse({ code: "TIER_NOT_PERMITTED_TO_SWAP", message: "Your verification tier does not permit currency swaps yet.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 403 });
    }
    if (message.includes("TIER_MAX_BALANCE_EXCEEDED")) {
      return createErrorResponse({ code: "TIER_MAX_BALANCE_EXCEEDED", message: "This swap would push your destination wallet above the balance your verification tier is allowed to hold.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 422 });
    }
    if (message.includes("INSUFFICIENT_WALLET_BALANCE")) {
      return createErrorResponse({ code: "INSUFFICIENT_WALLET_BALANCE", message: "Insufficient balance to cover this swap and fee.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 422 });
    }
    if (message.includes("DAILY_LIMIT_EXCEEDED")) {
      return createErrorResponse({ code: "DAILY_LIMIT_EXCEEDED", message: "This swap would exceed your wallet's daily limit.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 422 });
    }
    if (message.includes("WALLET_NOT_ACTIVE") || message.includes("DESTINATION_WALLET_NOT_ACTIVE")) {
      return createErrorResponse({ code: "WALLET_NOT_ACTIVE", message: "One of your wallets is not active. Please contact support.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 403 });
    }
    if (message.includes("FX_BOOK_NOT_CONFIGURED")) {
      return createErrorResponse({ code: "FX_BOOK_NOT_CONFIGURED", message: "FX swaps are temporarily unavailable. Please try again later.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 409 });
    }
    return createErrorResponse({
      code: "SWAP_FAILED",
      message: "We could not complete this swap. Please try again.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 502,
    });
  }

  return createSuccessResponse(
    {
      swap: {
        id: data.id,
        fromCurrency: data.from_currency,
        toCurrency: data.to_currency,
        fromAmount: Number(data.from_amount),
        fee: Number(data.fee),
        exchangeRate: Number(data.exchange_rate),
        toAmount: Number(data.to_amount),
        reference: data.reference,
        status: data.status,
        createdAt: data.created_at,
      },
    },
    {
      code: "SWAP_COMPLETED",
      message: `Swap complete. ${toAmount.toLocaleString()} ${toCurrency} has been credited to your wallet.`,
      requestId: customer.requestId,
      environment: "PRODUCTION",
    },
  );
}

export async function GET(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: "We could not confirm who you are. Please sign in again.", httpStatus: auth.httpStatus || 401, requestId: `KP-REQ-${Date.now()}` });
  }
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("customer_fx_swaps")
    .select("id, from_currency, to_currency, from_amount, fee, exchange_rate, to_amount, reference, status, created_at")
    .eq("customer_id", auth.customer.customerId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return createErrorResponse({ code: "SWAPS_LOOKUP_FAILED", message: "Unable to load your swap history right now.", httpStatus: 500, requestId: `KP-REQ-${Date.now()}` });
  }

  const swaps = (data || []).map((s: any) => ({
    id: s.id,
    fromCurrency: s.from_currency,
    toCurrency: s.to_currency,
    fromAmount: Number(s.from_amount),
    fee: Number(s.fee),
    exchangeRate: Number(s.exchange_rate),
    toAmount: Number(s.to_amount),
    reference: s.reference,
    status: s.status,
    createdAt: s.created_at,
  }));

  return createSuccessResponse({ swaps }, { requestId: auth.customer.requestId, environment: "PRODUCTION" });
}
