import { NextRequest } from "next/server";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * GET /api/customer/portal/adashi/groups/[groupId]
 *
 * Full 360 view of one Adashi circle for a member of it — group summary,
 * roster (names only, no other members' financial totals), cycles, and the
 * caller's own open contribution obligations. The caller must actually be
 * a member of this group (adashi.members row) or the request is rejected;
 * a customer can never read another customer's circle by guessing an id.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { groupId: string } }) {
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
  const groupId = params.groupId;

  const { data: myMembership } = await admin
    .schema("adashi")
    .from("members")
    .select("id, membership_status, kyc_tier, assigned_position, mandate_authorized, total_contributed, total_payout_received")
    .eq("group_id", groupId)
    .eq("customer_id", customer.customerId)
    .maybeSingle();

  if (!myMembership) {
    return createErrorResponse({ code: "NOT_A_MEMBER", message: "You are not a member of this Adashi circle.", requestId: customer.requestId, httpStatus: 403 });
  }

  const { data: group, error: groupError } = await admin
    .schema("adashi")
    .from("groups")
    .select("id, public_reference, name, currency, country_code, contribution_amount, frequency, target_members, current_members_count, total_cycles, current_cycle_number, total_pool_volume, status, started_at, assigned_agent_id")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError || !group) {
    return createErrorResponse({ code: "GROUP_NOT_FOUND", message: "Adashi circle not found.", requestId: customer.requestId, httpStatus: 404 });
  }

  const { data: members } = await admin
    .schema("adashi")
    .from("members")
    .select("id, customer_id, membership_status, assigned_position, joined_at")
    .eq("group_id", groupId)
    .order("assigned_position", { ascending: true, nullsFirst: false });

  const customerIds = Array.from(new Set((members || []).map((m: any) => m.customer_id)));
  const { data: customerRows } = customerIds.length
    ? await admin.from("customers").select("id, first_name, last_name").in("id", customerIds)
    : { data: [] as any[] };
  const nameById = new Map((customerRows || []).map((c: any) => [c.id, `${c.first_name} ${c.last_name}`.trim()]));

  const { data: cycles } = await admin
    .schema("adashi")
    .from("cycles")
    .select("id, cycle_number, beneficiary_customer_id, beneficiary_name, status, expected_pool, collected_pool, outstanding_amount, net_payout_amount, currency, contribution_deadline, grace_deadline")
    .eq("group_id", groupId)
    .order("cycle_number", { ascending: true });

  const { data: myObligations } = await admin
    .schema("adashi")
    .from("contribution_obligations")
    .select("id, cycle_id, cycle_number, amount, currency, status, due_date, grace_deadline, paid_at")
    .eq("group_id", groupId)
    .eq("customer_id", customer.customerId)
    .order("cycle_number", { ascending: true });

  return createSuccessResponse(
    {
      group: {
        id: group.id,
        reference: group.public_reference,
        name: group.name,
        currency: group.currency,
        countryCode: group.country_code,
        contributionAmount: Number(group.contribution_amount),
        frequency: group.frequency,
        targetMembers: group.target_members,
        currentMembersCount: group.current_members_count,
        totalCycles: group.total_cycles,
        currentCycleNumber: group.current_cycle_number,
        totalPoolVolume: Number(group.total_pool_volume),
        status: group.status,
        startedAt: group.started_at,
      },
      myMembership: {
        id: myMembership.id,
        status: myMembership.membership_status,
        kycTier: myMembership.kyc_tier,
        assignedPosition: myMembership.assigned_position,
        mandateAuthorized: myMembership.mandate_authorized,
        totalContributed: Number(myMembership.total_contributed),
        totalPayoutReceived: Number(myMembership.total_payout_received),
      },
      members: (members || []).map((m: any) => ({
        id: m.id,
        name: nameById.get(m.customer_id) || "Member",
        isMe: m.customer_id === customer.customerId,
        status: m.membership_status,
        assignedPosition: m.assigned_position,
        joinedAt: m.joined_at,
      })),
      cycles: (cycles || []).map((c: any) => ({
        id: c.id,
        cycleNumber: c.cycle_number,
        beneficiaryCustomerId: c.beneficiary_customer_id,
        beneficiaryName: c.beneficiary_name,
        isMyPayout: c.beneficiary_customer_id === customer.customerId,
        status: c.status,
        expectedPool: Number(c.expected_pool),
        collectedPool: Number(c.collected_pool),
        outstandingAmount: Number(c.outstanding_amount),
        netPayoutAmount: Number(c.net_payout_amount),
        currency: c.currency,
        contributionDeadline: c.contribution_deadline,
        graceDeadline: c.grace_deadline,
      })),
      myObligations: (myObligations || []).map((o: any) => ({
        id: o.id,
        cycleId: o.cycle_id,
        cycleNumber: o.cycle_number,
        amount: Number(o.amount),
        currency: o.currency,
        status: o.status,
        dueDate: o.due_date,
        graceDeadline: o.grace_deadline,
        paidAt: o.paid_at,
      })),
    },
    { requestId: customer.requestId, environment: "PRODUCTION" },
  );
}
