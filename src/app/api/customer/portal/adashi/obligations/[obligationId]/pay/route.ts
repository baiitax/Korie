import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { getWalletsForCustomer } from "@/lib/customer/customerData";

/**
 * POST /api/customer/portal/adashi/obligations/[obligationId]/pay
 *
 * Real contribution payment: debits the caller's own KoriePay wallet and
 * credits the group's real escrow ledger account via
 * public.post_adashi_contribution(). Previously this was a client-only
 * "obl-001" hardcoded id, no wallet debit ever happened, and the mock
 * engine just flipped an in-memory flag to PAID.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { obligationId: string } }) {
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
  const admin = getSupabaseAdminClient();
  const obligationId = params.obligationId;

  const { data: obligation, error: obligationError } = await admin
    .schema("adashi")
    .from("contribution_obligations")
    .select("id, customer_id, currency, amount, status")
    .eq("id", obligationId)
    .maybeSingle();

  if (obligationError || !obligation) {
    return createErrorResponse({ code: "OBLIGATION_NOT_FOUND", message: "Contribution obligation not found.", requestId: customer.requestId, httpStatus: 404 });
  }
  if (obligation.customer_id !== customer.customerId) {
    return createErrorResponse({ code: "FORBIDDEN", message: "This is not your contribution obligation.", requestId: customer.requestId, httpStatus: 403 });
  }

  const wallets = await getWalletsForCustomer(customer.customerId);
  const wallet = wallets.find((w) => w.currency === obligation.currency);
  if (!wallet) {
    return createErrorResponse({ code: "WALLET_NOT_FOUND", message: `You do not have a ${obligation.currency} wallet.`, requestId: customer.requestId, httpStatus: 404 });
  }

  const reference = `KP-${new Date().getFullYear()}-ADAOBL-${randomUUID().split("-")[0].toUpperCase()}`;
  const idempotencyKey = req.headers.get("idempotency-key") || req.headers.get("Idempotency-Key") || `idem-${reference}`;

  const { data, error } = await admin.rpc("post_adashi_contribution", {
    p_obligation_id: obligationId,
    p_customer_id: customer.customerId,
    p_wallet_id: wallet.id,
    p_idempotency_key: idempotencyKey,
    p_payment_reference: reference,
  });

  if (error) {
    const message = error.message || "";
    if (message.includes("INSUFFICIENT_WALLET_BALANCE")) {
      return createErrorResponse({ code: "INSUFFICIENT_WALLET_BALANCE", message: "Insufficient wallet balance to pay this contribution.", requestId: customer.requestId, httpStatus: 422 });
    }
    if (message.includes("WALLET_NOT_ACTIVE")) {
      return createErrorResponse({ code: "WALLET_NOT_ACTIVE", message: "Your wallet is not active. Please contact support.", requestId: customer.requestId, httpStatus: 403 });
    }
    if (message.includes("OBLIGATION_NOT_PAYABLE_IN_STATUS")) {
      return createErrorResponse({ code: "OBLIGATION_NOT_PAYABLE", message: "This contribution is not currently payable.", requestId: customer.requestId, httpStatus: 409 });
    }
    if (message.includes("CONTRIBUTION_ALREADY_IN_FLIGHT")) {
      return createErrorResponse({ code: "PAYMENT_IN_FLIGHT", message: "A payment for this contribution is already being processed.", requestId: customer.requestId, httpStatus: 409 });
    }
    if (message.includes("ESCROW_ACCOUNT_NOT_CONFIGURED")) {
      return createErrorResponse({ code: "ESCROW_NOT_CONFIGURED", message: "This circle is not ready to accept payments yet. Please contact support.", requestId: customer.requestId, httpStatus: 409 });
    }
    return createErrorResponse({ code: "PAYMENT_FAILED", message: "We could not process this payment. Please try again.", requestId: customer.requestId, httpStatus: 502 });
  }

  return createSuccessResponse(
    {
      obligation: {
        id: data.id,
        status: data.status,
        amount: Number(data.amount),
        currency: data.currency,
        paidAt: data.paid_at,
      },
    },
    { code: "CONTRIBUTION_PAID", message: "Contribution paid successfully from your wallet.", requestId: customer.requestId, environment: "PRODUCTION" },
  );
}
