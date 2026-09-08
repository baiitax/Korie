import { NextRequest } from "next/server";
import { authorizeAdminRequest, ADMIN_ROLES } from "@/lib/security/adminAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * POST /api/admin/adashi/payouts/[payoutId]/authorize
 *
 * The checker side of Adashi's maker-checker payout gate. Only a full
 * admin role may approve/reject a PENDING high-value payout, and
 * public.authorize_adashi_payout() enforces server-side that the checker
 * cannot be the same identity as the agent who initiated it (segregation
 * of duties) — this is not just a UI convention.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { payoutId: string } }) {
  const auth = await authorizeAdminRequest(req, ADMIN_ROLES);
  if (!auth.isAuthorized || !auth.userId) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: auth.errorMessage || "Unauthorized", requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: "INVALID_BODY", message: "Malformed request body.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const decision = String(body.decision || "").toUpperCase();
  const notes = String(body.notes || "");
  if (!["APPROVE", "REJECT"].includes(decision)) {
    return createErrorResponse({ code: "INVALID_DECISION", message: "Decision must be APPROVE or REJECT.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin.rpc("authorize_adashi_payout", {
    p_payout_id: params.payoutId,
    p_checker_id: auth.userId,
    p_checker_role: auth.roleName || "ADMIN",
    p_decision: decision,
    p_notes: notes,
  });

  if (error) {
    const message = error.message || "";
    if (message.includes("SEGREGATION_OF_DUTIES_VIOLATION")) {
      return createErrorResponse({ code: "SEGREGATION_OF_DUTIES_VIOLATION", message: "You initiated this payout and cannot also approve it.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 409 });
    }
    if (message.includes("PAYOUT_NOT_PENDING")) {
      return createErrorResponse({ code: "PAYOUT_NOT_PENDING", message: "This payout is no longer pending approval.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 409 });
    }
    return createErrorResponse({ code: "AUTHORIZATION_FAILED", message: "Could not process this decision.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 500 });
  }

  return createSuccessResponse(
    { payout: { id: data.id, status: data.status } },
    { code: decision === "APPROVE" ? "PAYOUT_APPROVED" : "PAYOUT_REJECTED", message: decision === "APPROVE" ? "Payout approved and disbursed." : "Payout rejected.", requestId: `KP-REQ-${Date.now()}`, environment: "PRODUCTION" },
  );
}
