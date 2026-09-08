import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { authenticateAgentRequest } from "@/lib/security/agentAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * POST /api/v1/agency/adashi/groups/[groupId]/members
 *
 * Invites a REAL KoriePay customer (looked up by phone number — never a
 * fabricated `cust-agent-${Date.now()}` id like the old mock engine used)
 * into an Adashi circle. The invited person must already hold a KoriePay
 * customer account; Adashi membership is never created for a phone number
 * with no backing account, since contributions/payouts move real wallet
 * money.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: auth.errorMessage || "Unauthorized", requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const groupId = params.groupId;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: "INVALID_BODY", message: "Malformed request body.", requestId: agent.requestId, httpStatus: 400 });
  }

  const phone = String(body.customerPhone || "").trim();
  if (!phone) {
    return createErrorResponse({ code: "MISSING_PHONE", message: "Saver's phone number is required.", requestId: agent.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data: group, error: groupError } = await admin
    .schema("adashi")
    .from("groups")
    .select("id, status, currency, min_members, target_members, current_members_count, assigned_agent_id")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError || !group) {
    return createErrorResponse({ code: "GROUP_NOT_FOUND", message: "Adashi circle not found.", requestId: agent.requestId, httpStatus: 404 });
  }
  if (group.assigned_agent_id !== agent.agentId) {
    return createErrorResponse({ code: "FORBIDDEN", message: "You do not manage this circle.", requestId: agent.requestId, httpStatus: 403 });
  }
  if (!["OPEN_FOR_MEMBERS", "MEMBERSHIP_REVIEW"].includes(group.status)) {
    return createErrorResponse({ code: "GROUP_NOT_OPEN", message: "This circle is no longer open for new members.", requestId: agent.requestId, httpStatus: 409 });
  }
  if (group.current_members_count >= group.target_members) {
    return createErrorResponse({ code: "GROUP_FULL", message: "This circle already has its full target membership.", requestId: agent.requestId, httpStatus: 409 });
  }

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .select("id, first_name, last_name, phone, kyc_tier, status")
    .eq("phone", phone)
    .maybeSingle();

  if (customerError || !customer) {
    return createErrorResponse({
      code: "CUSTOMER_NOT_FOUND",
      message: "No KoriePay customer account was found for this phone number. The saver must have a KoriePay account before joining a circle.",
      requestId: agent.requestId,
      httpStatus: 404,
    });
  }
  if (customer.status !== "ACTIVE") {
    return createErrorResponse({ code: "CUSTOMER_NOT_ACTIVE", message: "This customer's account is not active.", requestId: agent.requestId, httpStatus: 409 });
  }

  const { data: existingMember } = await admin
    .schema("adashi")
    .from("members")
    .select("id")
    .eq("group_id", groupId)
    .eq("customer_id", customer.id)
    .maybeSingle();
  if (existingMember) {
    return createErrorResponse({ code: "ALREADY_MEMBER", message: "This customer is already a member of this circle.", requestId: agent.requestId, httpStatus: 409 });
  }

  const membershipReference = `MBR-${randomUUID().split("-")[0].toUpperCase()}`;
  const kycTierNumber = customer.kyc_tier === "TIER_3" ? 3 : customer.kyc_tier === "TIER_2" ? 2 : 1;

  const { data: member, error: memberError } = await admin
    .schema("adashi")
    .from("members")
    .insert({
      group_id: groupId,
      customer_id: customer.id,
      membership_reference: membershipReference,
      membership_status: "INVITED",
      kyc_tier: kycTierNumber,
    })
    .select("id, membership_status")
    .single();

  if (memberError || !member) {
    return createErrorResponse({ code: "MEMBER_INVITE_FAILED", message: "Could not invite this customer. Please try again.", requestId: agent.requestId, httpStatus: 500 });
  }

  const invitationCode = randomUUID().split("-")[0].toUpperCase();
  await admin.schema("adashi").from("invitations").insert({
    group_id: groupId,
    inviter_id: agent.agentId,
    inviter_role: "AGENT",
    invitee_name: `${customer.first_name} ${customer.last_name}`.trim(),
    invitee_phone: customer.phone,
    invitation_code: invitationCode,
    status: "SENT",
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    delivered_at: new Date().toISOString(),
  });

  // Real notification row — no hardcoded SMS/WhatsApp copy baked into the
  // frontend. Content is generated here from real group/customer data.
  await admin.schema("adashi").from("notifications").insert({
    group_id: groupId,
    customer_id: customer.id,
    notification_type: "GROUP_INVITATION",
    channel: "SMS",
    recipient: customer.phone,
    content_preview: `You've been invited to join an Adashi savings circle on KoriePay. Open your app to accept and authorize your contribution mandate.`,
    delivery_status: "SENT",
  });

  await admin
    .schema("adashi")
    .from("groups")
    .update({ current_members_count: group.current_members_count + 1, updated_at: new Date().toISOString() })
    .eq("id", groupId);

  return createSuccessResponse(
    { member: { id: member.id, status: member.membership_status } },
    { code: "MEMBER_INVITED", message: `${customer.first_name} has been invited.`, requestId: agent.requestId, environment: "PRODUCTION" },
  );
}
