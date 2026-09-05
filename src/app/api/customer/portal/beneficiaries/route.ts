import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { BeneficiarySecurityEngine } from "@/lib/customer/BeneficiarySecurityEngine";
import { customerScopeFromRequest } from "@/lib/customer/customerScope";
import { engineToBeneficiary } from "@/lib/engineAdapters";

/**
 * /api/customer/portal/beneficiaries — owner-scoped beneficiary management.
 *
 * Why a new route: the pre-existing `/api/beneficiaries` endpoint reads
 * `?customerId=` straight off the query string and defaults it to a real
 * customer when absent, with no authentication at all. That is the exact
 * pattern this brief forbids ("never trust customerId provided by the
 * browser"). The admin/agent surfaces keep using their own routes; this one
 * is the customer portal's, and it derives the owner from the session.
 *
 *   GET    → beneficiaries owned by the authenticated customer
 *   POST   → register (24h new-payee cooldown applied by the engine)
 *   DELETE → remove by id, only if the row belongs to this customer
 */
export const dynamic = "force-dynamic";

function unauthorized(req: NextRequest, auth: { errorCode?: string; errorMessage?: string; httpStatus?: number }) {
  void req;
  return createErrorResponse({
    code: auth.errorCode || "UNAUTHORIZED",
    message: "We could not confirm who you are. Please sign in again.",
    httpStatus: auth.httpStatus || 401,
    requestId: `KP-REQ-${Date.now()}`,
  });
}

function forbidden() {
  return createErrorResponse({
    code: "CUSTOMER_IDENTITY_UNRESOLVED",
    message: "We could not resolve your profile for this session.",
    httpStatus: 403,
    requestId: `KP-REQ-${Date.now()}`,
  });
}

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["payments:read"]);
  if (!auth.isAuthenticated || !auth.context) return unauthorized(req, auth);
  const scope = customerScopeFromRequest(req, auth.context);
  if (!scope.ok || !scope.ownerCustomerId) return forbidden();

  const rows = BeneficiarySecurityEngine.getInstance().getBeneficiaries(scope.ownerCustomerId);
  return createSuccessResponse(
    { beneficiaries: rows.map(engineToBeneficiary), totalCount: rows.length },
    { requestId: auth.context.requestId, environment: auth.context.environment },
  );
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["payments:write"]);
  if (!auth.isAuthenticated || !auth.context) return unauthorized(req, auth);
  const scope = customerScopeFromRequest(req, auth.context);
  if (!scope.ok || !scope.ownerCustomerId) return forbidden();

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

  const name = String(body.name || "").trim();
  const accountNumber = String(body.accountNumber || "").replace(/\s+/g, "");
  const bankCode = String(body.bankCode || "").trim();
  const bankName = String(body.bankName || "").trim();
  const currency = String(body.currency || "").toUpperCase();

  const errors: { code: string; message: string; field?: string }[] = [];
  if (name.length < 3) errors.push({ code: "BENEFICIARY_NAME_REQUIRED", field: "name", message: "Enter the beneficiary's full name." });
  if (!/^\d{10,34}$/.test(accountNumber)) {
    errors.push({ code: "ACCOUNT_NUMBER_INVALID", field: "accountNumber", message: "Account numbers are 10–34 digits." });
  }
  if (!bankCode) errors.push({ code: "BANK_REQUIRED", field: "bankCode", message: "Select a bank." });
  if (currency !== "NGN" && currency !== "XOF") {
    errors.push({ code: "CURRENCY_UNSUPPORTED", field: "currency", message: "Only XOF and NGN accounts are supported." });
  }
  if (errors.length) {
    return createErrorResponse({
      code: "VALIDATION_FAILED",
      message: "Some details need correcting before we can save this payee.",
      httpStatus: 422,
      requestId: `KP-REQ-${Date.now()}`,
      details: errors,
    });
  }

  const created = BeneficiarySecurityEngine.getInstance().addBeneficiary({
    // customerId comes from the session, never from the body.
    customerId: scope.ownerCustomerId,
    beneficiaryName: name,
    accountNumber,
    bankName: bankName || "Commercial Bank",
    bankCode,
    currency: currency as "NGN" | "XOF",
    country: (body.country === "NE" ? "NE" : "NG") as "NG" | "NE",
    nickname: body.nickname ? String(body.nickname).slice(0, 40) : undefined,
    relationship: body.relationship ? String(body.relationship).slice(0, 40) : undefined,
  } as never);

  return createSuccessResponse(
    { beneficiary: engineToBeneficiary(created), cooldownUntil: created.cooldownExpiresAt },
    {
      code: "BENEFICIARY_REGISTERED",
      // The engine applies a 24h cooldown on new payees; say so, honestly.
      message: "Payee saved. Transfers to a new payee are limited for 24 hours.",
      requestId: auth.context.requestId,
      environment: auth.context.environment,
    },
  );
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["payments:write"]);
  if (!auth.isAuthenticated || !auth.context) return unauthorized(req, auth);
  const scope = customerScopeFromRequest(req, auth.context);
  if (!scope.ok || !scope.ownerCustomerId) return forbidden();

  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return createErrorResponse({
      code: "MISSING_ID",
      message: "Tell us which payee to remove.",
      httpStatus: 400,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }

  const removed = BeneficiarySecurityEngine.getInstance().removeBeneficiary(id, scope.ownerCustomerId);
  if (!removed) {
    // Same answer for "not yours" and "does not exist" — no enumeration.
    return createErrorResponse({
      code: "BENEFICIARY_NOT_FOUND",
      message: "We couldn't find that payee on your account.",
      httpStatus: 404,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }
  return createSuccessResponse(
    { removed: true, id },
    { requestId: auth.context.requestId, environment: auth.context.environment },
  );
}
