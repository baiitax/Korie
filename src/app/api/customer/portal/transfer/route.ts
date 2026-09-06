import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { quoteAgencyCommission } from "@/lib/agency/commissionPricing";
import { getWalletsForCustomer, getFxRates, transactionRowToCustomerTransaction, CustomerTransactionRow } from "@/lib/customer/customerData";

/**
 * POST /api/customer/portal/transfer
 *
 * Real, ledger-backed customer transfer. Calls public.post_customer_transfer(),
 * which locks the customer's wallet + backing ledger account, checks
 * status/balance/daily-limit, posts a real double-entry ledger transaction,
 * and inserts the customer_transactions row with
 * status = 'PENDING_PROVIDER_INTEGRATION' / provider_status = 'UNSENT'.
 *
 * There is no live Providus/Coris payout integration yet, so this endpoint
 * never claims the money has reached the recipient. The frontend must render
 * this as "processing" — never a green success confirmation.
 */
export const dynamic = "force-dynamic";

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

  const amount = Number(body.amount);
  const currency = String(body.currency || "").toUpperCase() as "NGN" | "XOF";
  const destinationCurrency = body.destinationCurrency
    ? (String(body.destinationCurrency).toUpperCase() as "NGN" | "XOF")
    : undefined;
  const isCrossBorder = Boolean(body.isCrossBorder) || Boolean(destinationCurrency && destinationCurrency !== currency);
  const recipientName = String(body.recipientName || "").trim();
  const recipientAccount = String(body.recipientAccount || "").trim();
  const recipientBank = String(body.recipientBank || "").trim();
  const recipientBankCode = body.recipientBankCode ? String(body.recipientBankCode).trim() : null;

  if (currency !== "NGN" && currency !== "XOF") {
    return createErrorResponse({ code: "CURRENCY_UNSUPPORTED", message: "Only NGN and XOF are supported.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return createErrorResponse({ code: "INVALID_AMOUNT", message: "Amount must be a positive number.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }
  if (!recipientName || !recipientAccount || !recipientBank) {
    return createErrorResponse({ code: "MISSING_RECIPIENT_DETAILS", message: "Recipient name, account number and bank are required.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }
  if (!isCrossBorder && currency !== "NGN") {
    return createErrorResponse({
      code: "XOF_DOMESTIC_NOT_YET_AVAILABLE",
      message: "Same-currency XOF transfers are coming soon through Coris Bank. You can currently transfer within the NGN<->XOF corridor.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 400,
    });
  }

  const admin = getSupabaseAdminClient();

  // Find the customer's own wallet for the SOURCE currency — never trust a
  // client-supplied wallet id.
  const wallets = await getWalletsForCustomer(customer.customerId);
  const sourceWallet = wallets.find((w) => w.currency === currency);
  if (!sourceWallet) {
    return createErrorResponse({ code: "WALLET_NOT_FOUND", message: `You do not have a ${currency} wallet.`, requestId: `KP-REQ-${Date.now()}`, httpStatus: 404 });
  }

  const txType = isCrossBorder ? "TRANSFER_CROSS_BORDER" : "TRANSFER_NIP";

  let fee = 0;
  try {
    const quote = await quoteAgencyCommission(admin, { transactionType: txType, currency, amount });
    fee = quote.customerFee;
  } catch {
    return createErrorResponse({ code: "FEE_QUOTE_FAILED", message: "Could not price this transfer.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 500 });
  }

  let exchangeRate: number | null = null;
  let destinationAmount: number | null = null;
  if (isCrossBorder) {
    const rates = await getFxRates();
    const match = rates.find((r) => r.fromCurrency === currency && r.toCurrency === (destinationCurrency || (currency === "NGN" ? "XOF" : "NGN")));
    if (!match) {
      return createErrorResponse({ code: "FX_RATE_UNAVAILABLE", message: "Exchange rate unavailable for this corridor.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 409 });
    }
    exchangeRate = match.rate;
    destinationAmount = Math.round((amount - fee) * match.rate * 100) / 100;
  }

  const reference = String(body.reference || `KP-${new Date().getFullYear()}-CTX-${randomUUID().split("-")[0].toUpperCase()}`);
  const idempotencyKey = req.headers.get("idempotency-key") || req.headers.get("Idempotency-Key") || `idem-${reference}`;

  const { data, error } = await admin.rpc("post_customer_transfer", {
    p_customer_id: customer.customerId,
    p_org_id: customer.orgId,
    p_wallet_id: sourceWallet.id,
    p_transaction_type: txType,
    p_amount: amount,
    p_currency: currency,
    p_fee: fee,
    p_destination_currency: isCrossBorder ? destinationCurrency || (currency === "NGN" ? "XOF" : "NGN") : null,
    p_exchange_rate: exchangeRate,
    p_destination_amount: destinationAmount,
    p_recipient_name: recipientName,
    p_recipient_account: recipientAccount,
    p_recipient_bank: recipientBank,
    p_recipient_bank_code: recipientBankCode,
    p_narration: body.description ? String(body.description).slice(0, 500) : null,
    p_idempotency_key: idempotencyKey,
    p_reference: reference,
  });

  if (error) {
    const message = error.message || "";
    if (message.includes("INSUFFICIENT_WALLET_BALANCE")) {
      return createErrorResponse({ code: "INSUFFICIENT_WALLET_BALANCE", message: "Insufficient balance to cover this transfer and fee.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 422 });
    }
    if (message.includes("DAILY_LIMIT_EXCEEDED")) {
      return createErrorResponse({ code: "DAILY_LIMIT_EXCEEDED", message: "This transfer would exceed your daily transaction limit.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 422 });
    }
    if (message.includes("WALLET_NOT_ACTIVE")) {
      return createErrorResponse({ code: "WALLET_NOT_ACTIVE", message: "Your wallet is not active. Please contact support.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 403 });
    }
    if (message.includes("CLEARING_ACCOUNT_NOT_CONFIGURED")) {
      return createErrorResponse({ code: "CLEARING_ACCOUNT_NOT_CONFIGURED", message: "Outbound transfer rail is not configured for this currency yet.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 409 });
    }
    return createErrorResponse({
      code: "TRANSFER_FAILED",
      message: "We could not confirm the transfer status yet. Please do not retry immediately — check transaction history first.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 502,
    });
  }

  const tx = data as CustomerTransactionRow;

  return createSuccessResponse(
    { transaction: transactionRowToCustomerTransaction(tx) },
    {
      code: "TRANSFER_STAGED",
      message: "Transfer debited from your wallet and staged for bank confirmation. This has not yet been confirmed as delivered.",
      requestId: customer.requestId,
      environment: "PRODUCTION",
    },
  );
}
