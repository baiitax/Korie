import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { ComplaintDisputeEngine } from "@/lib/complaints/ComplaintDisputeEngine";
import { CustomerLifecycleEngine } from "@/lib/customer/CustomerLifecycleEngine";
import { customerScopeFromRequest } from "@/lib/customer/customerScope";
import { ComplaintRecord, ComplaintCategory } from "@/types/regulatoryConsumerEngine";

/**
 * /api/customer/portal/disputes
 *
 * Customer-scoped complaints/disputes. This exists because the portal used to
 * "submit" a dispute by generating `KP-DISP-<random>` in the browser and
 * prepending it to local React state — the ticket never reached any queue, so
 * the customer was told a case existed when nothing did.
 *
 *   GET  → this customer's disputes only (filtered by the session identity,
 *          never by a client-supplied customerId).
 *   POST → creates a real ComplaintRecord in the ComplaintDisputeEngine, which
 *          is the same engine the compliance/admin queues read. The reference
 *          returned is the engine's own `complaintReference`.
 *
 * Amounts come from the transaction the customer is disputing — the route
 * resolves that from the engine rather than trusting a client-entered total.
 */
export const dynamic = "force-dynamic";

/**
 * The customer-facing dispute reasons, mapped onto the REAL
 * `ComplaintCategory` enum the compliance engine accepts. (The portal modal
 * previously posted `MONEY_NOT_RECEIVED`, which no engine category matches —
 * so even a connected submission would have been mis-classified.)
 */
const REASON_TO_CATEGORY: Record<string, ComplaintCategory> = {
  MONEY_NOT_RECEIVED: "FAILED_TRANSFER",
  FAILED_BUT_DEBITED: "FAILED_TRANSFER",
  DEBITED_TWICE: "DUPLICATE_DEBIT",
  UNRECOGNISED_DEBIT: "UNAUTHORIZED_TRANSACTION",
  FEE_QUERY: "FEE_DISPUTE",
  REFUND_DELAYED: "REFUND_DELAY",
  ACCOUNT_RESTRICTED: "ACCOUNT_RESTRICTION",
};
const ALLOWED_CATEGORIES = new Set<string>([
  "FAILED_TRANSFER",
  "DUPLICATE_DEBIT",
  "AGENT_OVERCHARGING",
  "AGENT_HARASSMENT",
  "UNAUTHORIZED_TRANSACTION",
  "POS_TERMINAL_GLITCH",
  "REFUND_DELAY",
  "FEE_DISPUTE",
  "ACCOUNT_RESTRICTION",
]);

function toCustomerView(c: ComplaintRecord) {
  return {
    id: c.id,
    ticketNumber: c.complaintReference,
    status: c.status,
    priority: c.priority,
    category: c.category,
    disputedAmount: c.disputedAmount,
    currency: c.currency,
    description: c.description,
    createdAt: c.createdAt,
    resolvedAt: c.resolvedAt,
    transactionReference: c.transactionReference,
    // Deliberately NOT returned: internal queue assignment (assignedTo/Email),
    // SLA timers and breach flags, resolution notes, GL journal id, and any
    // regulator-facing commentary — none of it is customer data.
  };
}

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["payments:read"]);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: "We could not confirm who you are. Please sign in again.",
      httpStatus: auth.httpStatus || 401,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }
  const scope = customerScopeFromRequest(req, auth.context);
  if (!scope.ok || !scope.ownerCustomerId) {
    return createErrorResponse({
      code: "CUSTOMER_IDENTITY_UNRESOLVED",
      message: "We could not resolve your profile for this session.",
      httpStatus: 403,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }

  const all = ComplaintDisputeEngine.getInstance().getComplaints();
  const mine = all.filter((c) => c.customerId === scope.ownerCustomerId);
  return createSuccessResponse(
    { disputes: mine.map(toCustomerView), totalCount: mine.length },
    { requestId: auth.context.requestId, environment: auth.context.environment },
  );
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["payments:read"]);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: "We could not confirm who you are. Please sign in again.",
      httpStatus: auth.httpStatus || 401,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }
  const scope = customerScopeFromRequest(req, auth.context);
  if (!scope.ok || !scope.ownerCustomerId) {
    return createErrorResponse({
      code: "CUSTOMER_IDENTITY_UNRESOLVED",
      message: "We could not resolve your profile for this session.",
      httpStatus: 403,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({
      code: "INVALID_BODY",
      message: "We couldn't read your request. Please try again.",
      httpStatus: 400,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }

  const rawReason = String(body.category || body.reason || "").trim().toUpperCase();
  const category = (REASON_TO_CATEGORY[rawReason] || rawReason) as string;
  const description = String(body.description || "").trim();
  const transactionReference = body.transactionReference
    ? String(body.transactionReference).trim().slice(0, 64)
    : undefined;

  if (!ALLOWED_CATEGORIES.has(category)) {
    return createErrorResponse({
      code: "INVALID_CATEGORY",
      message: "That dispute reason isn't supported. Please choose another.",
      httpStatus: 422,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }
  if (description.length < 10) {
    return createErrorResponse({
      code: "DESCRIPTION_TOO_SHORT",
      message: "Please describe the issue in at least a few words so we can investigate.",
      httpStatus: 422,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }

  const customer = CustomerLifecycleEngine.getInstance().getCustomer(scope.ownerCustomerId);
  if (!customer) {
    return createErrorResponse({
      code: "CUSTOMER_NOT_FOUND",
      message: "We couldn't open a case without a customer profile. Please contact support.",
      httpStatus: 403,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }

  // Resolve the disputed amount from the engine when a reference is supplied,
  // so a customer cannot inflate a claim (or the claim value cannot be guessed).
  let disputedAmount = 0;
  let currency: "NGN" | "XOF" = customer.country === "NE" ? "XOF" : "NGN";
  if (transactionReference) {
    const { TransactionService } = await import("@/lib/services/TransactionService");
    const tx = TransactionService.findRawForOwner(transactionReference, scope.ownerCustomerId);
    if (tx) {
      disputedAmount = Math.round(tx.amount) / 100; // minor → whole units
      currency = (tx.currency as "NGN" | "XOF") || currency;
    }
  }

  const complaint = ComplaintDisputeEngine.getInstance().createComplaint({
    customerId: customer.id,
    customerName: customer.fullName,
    customerPhone: customer.phone,
    country: customer.country,
    category: category as ComplaintCategory,
    priority: "P1",
    transactionReference,
    disputedAmount,
    currency,
    description,
  });

  return createSuccessResponse({ dispute: toCustomerView(complaint) },
    {
      code: "DISPUTE_LOGGED",
      message: "Your claim has been logged with our dispute team.",
      requestId: auth.context.requestId,
      correlationId: auth.context.correlationId,
      environment: auth.context.environment,
    },
  );
}
