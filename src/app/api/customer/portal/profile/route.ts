import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCustomerById, customerRowToUser } from "@/lib/customer/customerData";

/**
 * /api/customer/portal/profile
 *
 * PATCH updates the two `customers` columns the verification checklist
 * actually needs and has nowhere else to collect: `date_of_birth` and
 * `residential_address`. Before this route existed, the KYC page told a
 * customer "Add your date of birth" / "Add the residential address shown on
 * a recent utility bill" with no field anywhere in the product that wrote to
 * those columns — a permanent dead end for any customer whose tier requires
 * them. This does not touch kyc_tier, status or any identity document; those
 * stay reviewer- or provider-controlled.
 *
 * Validation is deliberately strict and boring:
 *   • date_of_birth must be a real calendar date, in the past, and imply an
 *     age of at least 18 (KoriePay does not onboard minors);
 *   • residential_address is free text but must be a real few-word address,
 *     not a token — 8..500 chars after trimming.
 */
export const dynamic = "force-dynamic";

function fail(code: string, message: string, httpStatus = 422) {
  return createErrorResponse({ code, message, httpStatus, requestId: `KP-REQ-${Date.now()}` });
}

function isValidPastAdultDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const dob = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  if (dob.getTime() >= now.getTime()) return false;
  const eighteenYearsAgo = new Date(Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()));
  if (dob.getTime() > eighteenYearsAgo.getTime()) return false;
  const hundredTwentyYearsAgo = new Date(Date.UTC(now.getUTCFullYear() - 120, now.getUTCMonth(), now.getUTCDate()));
  if (dob.getTime() < hundredTwentyYearsAgo.getTime()) return false;
  return true;
}

export async function GET(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return fail(auth.errorCode || "UNAUTHORIZED", "Please sign in to view your profile.", auth.httpStatus || 401);
  }
  const customer = await getCustomerById(auth.customer.customerId);
  if (!customer) return fail("CUSTOMER_NOT_FOUND", "We could not load your customer profile.", 404);
  return createSuccessResponse(
    { customer: customerRowToUser(customer), dateOfBirth: customer.date_of_birth, residentialAddress: customer.residential_address },
    { requestId: auth.customer.requestId, environment: "PRODUCTION" },
  );
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return fail(auth.errorCode || "UNAUTHORIZED", "Please sign in to update your profile.", auth.httpStatus || 401);
  }

  const customer = await getCustomerById(auth.customer.customerId);
  if (!customer) return fail("CUSTOMER_NOT_FOUND", "We could not load your customer profile.", 404);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON.");
  }

  const updates: Record<string, string> = {};

  if (body.dateOfBirth !== undefined) {
    const dob = String(body.dateOfBirth).trim();
    if (!isValidPastAdultDate(dob)) {
      return fail("INVALID_DATE_OF_BIRTH", "Enter a valid date of birth (you must be at least 18 years old).");
    }
    updates.date_of_birth = dob;
  }

  if (body.residentialAddress !== undefined) {
    const address = String(body.residentialAddress).trim();
    if (address.length < 8 || address.length > 500) {
      return fail("INVALID_ADDRESS", "Enter your full residential address (at least 8 characters).");
    }
    updates.residential_address = address;
  }

  if (Object.keys(updates).length === 0) {
    return fail("NO_FIELDS_PROVIDED", "Provide dateOfBirth and/or residentialAddress to update.");
  }

  const admin = getSupabaseAdminClient();
  const { data: updated, error } = await admin
    .from("customers")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", customer.id)
    .select("id, org_id, first_name, last_name, email, phone, country, preferred_language, kyc_tier, status, date_of_birth, residential_address, created_at, updated_at, auth_user_id")
    .single();

  if (error || !updated) {
    return fail("PROFILE_UPDATE_FAILED", "We couldn't save your details. Please try again.", 500);
  }

  return createSuccessResponse(
    { customer: customerRowToUser(updated as any), dateOfBirth: updated.date_of_birth, residentialAddress: updated.residential_address },
    { code: "PROFILE_UPDATED", message: "Your profile has been updated.", requestId: auth.customer.requestId, environment: "PRODUCTION" },
  );
}
