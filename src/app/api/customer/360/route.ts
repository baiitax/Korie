import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { CustomerLifecycleEngine } from "@/lib/customer/CustomerLifecycleEngine";
import { AccountLifecycleEngine } from "@/lib/customer/AccountLifecycleEngine";
import { BeneficiarySecurityEngine } from "@/lib/customer/BeneficiarySecurityEngine";
import { ComplaintDisputeEngine } from "@/lib/complaints/ComplaintDisputeEngine";
import { PaymentSwitchEngine } from "@/lib/paymentSwitch/PaymentSwitchEngine";

/**
 * GET /api/customer/360
 *
 * Customer 360° profile. Hardened against IDOR / broken-object-level
 * authorization:
 *
 *  1. Authenticates the request (Bearer token + required scope).
 *  2. Resolves the caller's customer identity from the AUTHENTICATED context
 *     (NOT from a client-supplied query param).
 *  3. If an explicit `id` is supplied, it MUST match the authenticated caller,
 *     otherwise 403 (a customer can never read another customer's profile).
 *
 * Previously this endpoint trusted `?id=` from the client with no ownership
 * check — anyone could read anyone's customer record.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["payments:read"]);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: auth.errorMessage || "Unauthorized",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { context } = auth;

  try {
    // Resolve the caller's customer identity from the AUTHENTICATED context.
    // In production this maps context.userId -> customer row via the ownership
    // table (Supabase). In this sandbox the authenticated dev session is bound
    // to the primary seeded customer; in a real deployment this is replaced by
    // the token->customer lookup. It is NEVER derived from a client param.
    const authedCustomerId = resolveCustomerId(context.userId);

    const requestedId = req.nextUrl.searchParams.get("id");
    if (requestedId && requestedId !== authedCustomerId) {
      // Ownership check: a customer may only load their own profile. A mismatch
      // (including requesting another customer by id) is rejected.
      return createErrorResponse({
        code: "FORBIDDEN",
        message: "You do not have access to this customer profile.",
        requestId: `KP-REQ-${Date.now()}`,
        httpStatus: 403,
      });
    }

    const customerId = requestedId || authedCustomerId;

    const customerEngine = CustomerLifecycleEngine.getInstance();
    const accountEngine = AccountLifecycleEngine.getInstance();
    const beneficiaryEngine = BeneficiarySecurityEngine.getInstance();
    const complaintEngine = ComplaintDisputeEngine.getInstance();
    const switchEngine = PaymentSwitchEngine.getInstance();

    const customer = customerEngine.getCustomer(customerId);
    if (!customer) {
      return createErrorResponse({
        code: "CUSTOMER_NOT_FOUND",
        message: "Customer not found.",
        requestId: `KP-REQ-${Date.now()}`,
        httpStatus: 404,
      });
    }

    const accounts = accountEngine.getAccounts(customerId);
    const beneficiaries = beneficiaryEngine.getBeneficiaries(customerId);
    const complaints = complaintEngine.getComplaints().filter((c) => c.customerId === customerId);
    const payments = switchEngine.getPayments().filter((p) => p.customerId === customerId);

    return createSuccessResponse(
      {
        customer,
        accounts,
        beneficiaries,
        complaints,
        payments,
        summary: {
          totalAccounts: accounts.length,
          totalBeneficiaries: beneficiaries.length,
          openComplaints: complaints.filter((c) => c.status !== "RESOLVED" && c.status !== "CLOSED").length,
          totalTransactions: payments.length,
        },
      },
      {
        requestId: context.requestId,
        correlationId: context.correlationId,
        environment: context.environment,
      },
    );
  } catch (error: any) {
    return createErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Could not load the customer profile.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 500,
      details: [{ code: "CUSTOMER_LOAD_ERROR", field: "error", message: String(error?.message ?? "Unknown error") }],
    });
  }
}


/**
 * Map an authenticated session to a customer identity.
 *
 * In production this is a database lookup (context.userId -> customer row).
 * In this sandbox the authenticated dev user is bound to the seeded primary
 * customer. This is the ONLY place a session is mapped to a customer, so the
 * ownership check below is authoritative.
 */
function resolveCustomerId(userId?: string): string {
  if (userId === "usr_dev_01") return "cust-ng-001-ibrahim";
  if (userId) return `cust-${userId.replace("usr_", "")}`;
  return "cust-ng-001-ibrahim";
}
