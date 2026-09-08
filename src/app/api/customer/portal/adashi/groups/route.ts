import { NextRequest } from "next/server";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * GET /api/customer/portal/adashi/groups
 *
 * Real Adashi circles the authenticated customer actually belongs to,
 * read live from adashi.members joined to adashi.groups — this replaces
 * the in-memory AdashiStore + hardcoded 'cust-ng-101' identity that the
 * old /api/v1/adashi/groups endpoint used. The customer's identity comes
 * exclusively from their verified Supabase session (authenticateCustomerRequest),
 * never from a client-supplied header or fallback string.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: auth.errorMessage || "Unauthorized",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }
  const { customer } = auth;
  const admin = getSupabaseAdminClient();

  const { data: memberships, error: memberError } = await admin
    .schema("adashi")
    .from("members")
    .select("id, group_id, membership_status, kyc_tier, assigned_position, mandate_authorized, total_contributed, total_payout_received")
    .eq("customer_id", customer.customerId);

  if (memberError) {
    return createErrorResponse({ code: "ADASHI_MEMBERSHIPS_LOOKUP_FAILED", message: "Unable to load your Adashi circles right now.", requestId: customer.requestId, httpStatus: 500 });
  }

  const groupIds = (memberships || []).map((m: any) => m.group_id);
  if (groupIds.length === 0) {
    return createSuccessResponse({ groups: [] }, { requestId: customer.requestId, environment: "PRODUCTION" });
  }

  const { data: groups, error: groupsError } = await admin
    .schema("adashi")
    .from("groups")
    .select("id, public_reference, name, currency, country_code, contribution_amount, frequency, target_members, current_members_count, total_cycles, current_cycle_number, total_pool_volume, status, started_at")
    .in("id", groupIds)
    .order("created_at", { ascending: false });

  if (groupsError) {
    return createErrorResponse({ code: "ADASHI_GROUPS_LOOKUP_FAILED", message: "Unable to load your Adashi circles right now.", requestId: customer.requestId, httpStatus: 500 });
  }

  const membershipByGroup = new Map((memberships || []).map((m: any) => [m.group_id, m]));

  const result = (groups || []).map((g: any) => {
    const membership = membershipByGroup.get(g.id);
    return {
      id: g.id,
      reference: g.public_reference,
      name: g.name,
      currency: g.currency,
      countryCode: g.country_code,
      contributionAmount: Number(g.contribution_amount),
      frequency: g.frequency,
      targetMembers: g.target_members,
      currentMembersCount: g.current_members_count,
      totalCycles: g.total_cycles,
      currentCycleNumber: g.current_cycle_number,
      totalPoolVolume: Number(g.total_pool_volume),
      status: g.status,
      startedAt: g.started_at,
      myMembership: membership
        ? {
            id: membership.id,
            status: membership.membership_status,
            kycTier: membership.kyc_tier,
            assignedPosition: membership.assigned_position,
            mandateAuthorized: membership.mandate_authorized,
            totalContributed: Number(membership.total_contributed),
            totalPayoutReceived: Number(membership.total_payout_received),
          }
        : null,
    };
  });

  return createSuccessResponse({ groups: result }, { requestId: customer.requestId, environment: "PRODUCTION" });
}
