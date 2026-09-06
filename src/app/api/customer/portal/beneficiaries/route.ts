import { NextRequest } from "next/server";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getBeneficiariesForCustomer, beneficiaryRowToBeneficiary, BeneficiaryRow } from "@/lib/customer/customerData";

/**
 * /api/customer/portal/beneficiaries — owner-scoped beneficiary management,
 * real-DB backed (public.customer_beneficiaries). Identity is derived from
 * the authenticated Supabase session only — never from a client-supplied id.
 *
 *   GET    → beneficiaries owned by the authenticated customer
 *   POST   → register (DB default applies the 24h new-payee cooldown)
 *   DELETE → soft-remove (status = REMOVED) by id, only if owned by the caller
 */
export const dynamic = "force-dynamic";

function unauthorized(auth: { errorCode?: string; httpStatus?: number }) {
  return createErrorResponse({
    code: auth.errorCode || "UNAUTHORIZED",
    message: "We could not confirm who you are. Please sign in again.",
    httpStatus: auth.httpStatus || 401,
    requestId: `KP-REQ-${Date.now()}`,
  });
}

export async function GET(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) return unauthorized(auth);

  const rows = await getBeneficiariesForCustomer(auth.customer.customerId);
  return createSuccessResponse(
    { beneficiaries: rows.map(beneficiaryRowToBeneficiary), totalCount: rows.length },
    { requestId: auth.customer.requestId, environment: "PRODUCTION" },
  );
}

export async function POST(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) return unauthorized(auth);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: "INVALID_BODY", message: "We couldn't read your request. Please try again.", httpStatus: 400, requestId: `KP-REQ-${Date.now()}` });
  }

  const name = String(body.name || "").trim();
  const accountNumber = String(body.accountNumber || "").replace(/\s+/g, "");
  const bankCode = String(body.bankCode || "").trim();
  const bankName = String(body.bankName || "").trim();
  const currency = String(body.currency || "").toUpperCase();
  const country = body.country === "NE" ? "NE" : "NG";

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
    return createErrorResponse({ code: "VALIDATION_FAILED", message: "Some details need correcting before we can save this payee.", httpStatus: 422, requestId: `KP-REQ-${Date.now()}`, details: errors });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("customer_beneficiaries")
    .insert({
      customer_id: auth.customer.customerId,
      beneficiary_name: name,
      account_number: accountNumber,
      bank_name: bankName || "Commercial Bank",
      bank_code: bankCode,
      currency,
      country,
      nickname: body.nickname ? String(body.nickname).slice(0, 40) : null,
      relationship: body.relationship ? String(body.relationship).slice(0, 40) : null,
    })
    .select("id, customer_id, beneficiary_name, account_number, bank_code, bank_name, currency, country, nickname, relationship, status, cooldown_expires_at, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return createErrorResponse({ code: "BENEFICIARY_ALREADY_EXISTS", message: "You already have a payee with this account number and bank.", httpStatus: 409, requestId: `KP-REQ-${Date.now()}` });
    }
    return createErrorResponse({ code: "BENEFICIARY_SAVE_FAILED", message: "We couldn't save this payee. Please try again.", httpStatus: 500, requestId: `KP-REQ-${Date.now()}` });
  }

  const created = data as BeneficiaryRow;
  return createSuccessResponse(
    { beneficiary: beneficiaryRowToBeneficiary(created), cooldownUntil: created.cooldown_expires_at },
    {
      code: "BENEFICIARY_REGISTERED",
      message: "Payee saved. Transfers to a new payee are limited for 24 hours.",
      requestId: auth.customer.requestId,
      environment: "PRODUCTION",
    },
  );
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) return unauthorized(auth);

  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return createErrorResponse({ code: "MISSING_ID", message: "Tell us which payee to remove.", httpStatus: 400, requestId: `KP-REQ-${Date.now()}` });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("customer_beneficiaries")
    .update({ status: "REMOVED", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("customer_id", auth.customer.customerId)
    .eq("status", "ACTIVE")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return createErrorResponse({ code: "BENEFICIARY_NOT_FOUND", message: "We couldn't find that payee on your account.", httpStatus: 404, requestId: `KP-REQ-${Date.now()}` });
  }

  return createSuccessResponse({ removed: true, id }, { requestId: auth.customer.requestId, environment: "PRODUCTION" });
}
