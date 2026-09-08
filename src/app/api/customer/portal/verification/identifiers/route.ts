import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { getCustomerById } from "@/lib/customer/customerData";
import {
  captureIdentifier,
  getIdentifiersForCustomer,
  identifierTypesForCountry,
  IdentifierType,
} from "@/lib/customer/identifierVerification";

/**
 * /api/customer/portal/verification/identifiers
 *
 * BVN/NIN (Nigeria) or NIF/NNI (Niger) capture — see identifierVerification.ts
 * for why these are stored as PENDING and never auto-verified: KoriePay has
 * no live NIBSS/NIMC/CENTIF-NE integration, so a submitted identifier goes to
 * a human reviewer (admin/compliance), matching the honest-pending-provider
 * pattern used for customer transfers elsewhere in this codebase.
 *
 * GET returns the customer's identifier records (masked only — the plaintext
 * value is never sent back to any client after capture).
 * POST captures a new identifier of a given type.
 */
export const dynamic = "force-dynamic";

function fail(code: string, message: string, httpStatus = 422) {
  return createErrorResponse({ code, message, httpStatus, requestId: `KP-REQ-${Date.now()}` });
}

export async function GET(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return fail(auth.errorCode || "UNAUTHORIZED", "Please sign in to view your identifiers.", auth.httpStatus || 401);
  }

  const customer = await getCustomerById(auth.customer.customerId);
  if (!customer) return fail("CUSTOMER_NOT_FOUND", "We could not load your customer profile.", 404);

  const identifiers = await getIdentifiersForCustomer(customer.id);
  return createSuccessResponse(
    {
      applicableTypes: identifierTypesForCountry(customer.country),
      identifiers: identifiers.map((r) => ({
        id: r.id,
        idType: r.id_type,
        idNumberMasked: r.id_number_masked,
        status: r.verification_status,
        rejectionReason: r.verification_status === "FAILED" ? r.rejection_reason || undefined : undefined,
        createdAt: r.created_at,
      })),
    },
    { requestId: auth.customer.requestId, environment: "PRODUCTION" },
  );
}

export async function POST(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return fail(auth.errorCode || "UNAUTHORIZED", "Please sign in to submit an identifier.", auth.httpStatus || 401);
  }

  const customer = await getCustomerById(auth.customer.customerId);
  if (!customer) return fail("CUSTOMER_NOT_FOUND", "We could not load your customer profile.", 404);

  let body: { idType?: string; value?: string };
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const idType = String(body.idType || "").toUpperCase() as IdentifierType;
  const value = String(body.value || "");
  const applicable = identifierTypesForCountry(customer.country);

  if (!applicable.includes(idType)) {
    return fail("UNSUPPORTED_IDENTIFIER_TYPE", `Only ${applicable.join(" or ")} can be submitted for your jurisdiction.`);
  }
  if (!value) return fail("VALUE_REQUIRED", `Enter your ${idType}.`);

  const result = await captureIdentifier(customer.id, idType, value);
  if (!result.ok) {
    return fail(result.code, result.message, result.code === "IDENTIFIER_ALREADY_SUBMITTED" ? 409 : 422);
  }

  return createSuccessResponse(
    {
      identifier: {
        id: result.record.id,
        idType: result.record.id_type,
        idNumberMasked: result.record.id_number_masked,
        status: result.record.verification_status,
        createdAt: result.record.created_at,
      },
    },
    {
      code: "IDENTIFIER_RECEIVED",
      message: `Your ${idType} has been received and is pending review.`,
      requestId: auth.customer.requestId,
      environment: "PRODUCTION",
    },
  );
}
