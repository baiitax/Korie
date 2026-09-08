import { NextRequest } from "next/server";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * POST /api/customer/portal/adashi/groups/[groupId]/consent
 *
 * The invited member's real electronic consent + auto-debit mandate
 * authorization — required before an agent can lock membership
 * (adashi.lock_membership() rejects the group otherwise). Writes a real
 * adashi.consents row (with the caller's real IP) and flips the member's
 * own adashi.members row to CONSENT_ACCEPTED — never a client-only "is
 * this me" string match against a hardcoded name, as the old customer page
 * did.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: auth.errorMessage || "Unauthorized", requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { customer } = auth;
  const admin = getSupabaseAdminClient();
  const groupId = params.groupId;

  const { data: member, error: memberError } = await admin
    .schema("adashi")
    .from("members")
    .select("id, membership_status")
    .eq("group_id", groupId)
    .eq("customer_id", customer.customerId)
    .maybeSingle();

  if (memberError || !member) {
    return createErrorResponse({ code: "NOT_INVITED", message: "You have not been invited to this Adashi circle.", requestId: customer.requestId, httpStatus: 404 });
  }
  if (member.membership_status === "CONSENT_ACCEPTED" || member.membership_status === "ACTIVE_LOCKED") {
    return createSuccessResponse({ member: { id: member.id, status: member.membership_status } }, { code: "ALREADY_CONSENTED", message: "You have already accepted this circle's terms.", requestId: customer.requestId, environment: "PRODUCTION" });
  }
  if (member.membership_status !== "INVITED") {
    return createErrorResponse({ code: "NOT_INVITABLE_STATUS", message: "This invitation is no longer active.", requestId: customer.requestId, httpStatus: 409 });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || null;

  await admin.schema("adashi").from("consents").insert([
    { customer_id: customer.customerId, group_id: groupId, member_id: member.id, consent_type: "TERMS_AND_CONDITIONS", ip_address: clientIp },
    { customer_id: customer.customerId, group_id: groupId, member_id: member.id, consent_type: "AUTO_DEBIT_MANDATE", ip_address: clientIp },
  ]);

  const { data: updated, error: updateError } = await admin
    .schema("adashi")
    .from("members")
    .update({ membership_status: "CONSENT_ACCEPTED", mandate_authorized: true, mandate_authorized_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", member.id)
    .select("id, membership_status")
    .single();

  if (updateError || !updated) {
    return createErrorResponse({ code: "CONSENT_RECORD_FAILED", message: "Could not record your consent. Please try again.", requestId: customer.requestId, httpStatus: 500 });
  }

  await admin.schema("adashi").from("invitations").update({ status: "ACCEPTED", actioned_at: new Date().toISOString() }).eq("group_id", groupId).eq("invitee_phone", customer.phone).eq("status", "SENT");

  return createSuccessResponse(
    { member: { id: updated.id, status: updated.membership_status } },
    { code: "CONSENT_ACCEPTED", message: "You have joined this Adashi circle and authorized your contribution mandate.", requestId: customer.requestId, environment: "PRODUCTION" },
  );
}
