import { NextRequest } from "next/server";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTransactionByReferenceForCustomer } from "@/lib/customer/customerData";

/**
 * /api/customer/portal/disputes
 *
 * Real, DB-backed customer complaints/disputes against public.customer_disputes
 * — the same table the compliance/admin back office reads. Nothing here
 * fabricates a ticket in browser state; every dispute created is a genuine row.
 *
 *   GET  → this customer's disputes only (scoped by authenticated identity).
 *   POST → creates a real customer_disputes row. The disputed amount is
 *          resolved server-side from the referenced transaction when given —
 *          a customer cannot inflate a claim by supplying their own total.
 */
export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES = new Set([
  "FAILED_TRANSFER",
  "DUPLICATE_DEBIT",
  "UNAUTHORIZED_TRANSACTION",
  "REFUND_DELAY",
  "FEE_DISPUTE",
  "ACCOUNT_RESTRICTION",
  "OTHER",
]);

const REASON_TO_CATEGORY: Record<string, string> = {
  MONEY_NOT_RECEIVED: "FAILED_TRANSFER",
  FAILED_BUT_DEBITED: "FAILED_TRANSFER",
  DEBITED_TWICE: "DUPLICATE_DEBIT",
  UNRECOGNISED_DEBIT: "UNAUTHORIZED_TRANSACTION",
  FEE_QUERY: "FEE_DISPUTE",
  REFUND_DELAYED: "REFUND_DELAY",
  ACCOUNT_RESTRICTED: "ACCOUNT_RESTRICTION",
};

function toCustomerView(row: any) {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    status: row.status,
    priority: row.priority,
    category: row.category,
    disputedAmount: row.disputed_amount != null ? Number(row.disputed_amount) : undefined,
    currency: row.currency,
    description: row.description,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    transactionReference: row.transaction_reference,
  };
}

export async function GET(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: "We could not confirm who you are. Please sign in again.", httpStatus: auth.httpStatus || 401, requestId: `KP-REQ-${Date.now()}` });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("customer_disputes")
    .select("id, ticket_number, status, priority, category, disputed_amount, currency, description, created_at, resolved_at, transaction_reference")
    .eq("customer_id", auth.customer.customerId)
    .order("created_at", { ascending: false });

  if (error) {
    return createErrorResponse({ code: "DISPUTES_LOOKUP_FAILED", message: "Unable to load your cases right now.", httpStatus: 500, requestId: `KP-REQ-${Date.now()}` });
  }

  const mine = (data || []).map(toCustomerView);
  return createSuccessResponse({ disputes: mine, totalCount: mine.length }, { requestId: auth.customer.requestId, environment: "PRODUCTION" });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: "We could not confirm who you are. Please sign in again.", httpStatus: auth.httpStatus || 401, requestId: `KP-REQ-${Date.now()}` });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: "INVALID_BODY", message: "We couldn't read your request. Please try again.", httpStatus: 400, requestId: `KP-REQ-${Date.now()}` });
  }

  const rawReason = String(body.category || body.reason || "").trim().toUpperCase();
  const category = REASON_TO_CATEGORY[rawReason] || rawReason;
  const description = String(body.description || "").trim();
  const transactionReference = body.transactionReference ? String(body.transactionReference).trim().slice(0, 64) : undefined;

  if (!ALLOWED_CATEGORIES.has(category)) {
    return createErrorResponse({ code: "INVALID_CATEGORY", message: "That dispute reason isn't supported. Please choose another.", httpStatus: 422, requestId: `KP-REQ-${Date.now()}` });
  }
  if (description.length < 10) {
    return createErrorResponse({ code: "DESCRIPTION_TOO_SHORT", message: "Please describe the issue in at least a few words so we can investigate.", httpStatus: 422, requestId: `KP-REQ-${Date.now()}` });
  }

  let disputedAmount: number | null = null;
  let currency: "NGN" | "XOF" | null = null;
  if (transactionReference) {
    const tx = await getTransactionByReferenceForCustomer(transactionReference, auth.customer.customerId);
    if (tx) {
      disputedAmount = Number(tx.amount);
      currency = tx.currency;
    }
  }

  const ticketNumber = `KP-DISP-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("customer_disputes")
    .insert({
      customer_id: auth.customer.customerId,
      transaction_reference: transactionReference || null,
      ticket_number: ticketNumber,
      category,
      disputed_amount: disputedAmount,
      currency,
      description,
      priority: "P1",
    })
    .select("id, ticket_number, status, priority, category, disputed_amount, currency, description, created_at, resolved_at, transaction_reference")
    .single();

  if (error) {
    return createErrorResponse({ code: "DISPUTE_SAVE_FAILED", message: "We couldn't log your case. Please try again.", httpStatus: 500, requestId: `KP-REQ-${Date.now()}` });
  }

  return createSuccessResponse(
    { dispute: toCustomerView(data) },
    { code: "DISPUTE_LOGGED", message: "Your claim has been logged with our dispute team.", requestId: auth.customer.requestId, environment: "PRODUCTION" },
  );
}
