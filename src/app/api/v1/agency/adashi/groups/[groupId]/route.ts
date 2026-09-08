import { NextRequest } from "next/server";
import { authenticateAgentRequest } from "@/lib/security/agentAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * GET /api/v1/agency/adashi/groups/[groupId]
 *
 * Full circle workspace view for the assigned agent: group header, real
 * enrolled members (adashi.members joined to public.customers for display
 * name/phone), and cycles with their contribution obligations — replaces
 * AdashiGroupLifecycleEngine's in-memory getGroupDetails().
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { groupId: string } }) {
  const auth = await authenticateAgentRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: auth.errorMessage || "Unauthorized", requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();
  const groupId = params.groupId;

  const { data: group, error: groupError } = await admin
    .schema("adashi")
    .from("groups")
    .select(
      "id, public_reference, name, currency, country_code, contribution_amount, frequency, target_members, current_members_count, total_cycles, current_cycle_number, total_pool_volume, status, assigned_agent_id, started_at",
    )
    .eq("id", groupId)
    .maybeSingle();

  if (groupError || !group) {
    return createErrorResponse({ code: "GROUP_NOT_FOUND", message: "Adashi circle not found.", requestId: agent.requestId, httpStatus: 404 });
  }
  if (group.assigned_agent_id !== agent.agentId) {
    return createErrorResponse({ code: "FORBIDDEN", message: "You do not manage this circle.", requestId: agent.requestId, httpStatus: 403 });
  }

  const { data: memberRows } = await admin
    .schema("adashi")
    .from("members")
    .select("id, customer_id, membership_status, kyc_tier, assigned_position, mandate_authorized, total_contributed, total_payout_received")
    .eq("group_id", groupId)
    .order("assigned_position", { ascending: true, nullsFirst: false });

  const customerIds = Array.from(new Set((memberRows || []).map((m: any) => m.customer_id)));
  const { data: customerRows } = customerIds.length
    ? await admin.from("customers").select("id, first_name, last_name, phone").in("id", customerIds)
    : { data: [] as any[] };
  const customerById = new Map((customerRows || []).map((c: any) => [c.id, c]));

  const members = (memberRows || []).map((m: any) => {
    const c = customerById.get(m.customer_id);
    return {
      id: m.id,
      customerName: c ? `${c.first_name} ${c.last_name}`.trim() : "Unknown",
      customerPhone: c?.phone || null,
      status: m.membership_status,
      kycTier: m.kyc_tier,
      assignedPosition: m.assigned_position,
      mandateAuthorized: m.mandate_authorized,
      totalContributedAmount: Number(m.total_contributed),
      totalPayoutReceived: Number(m.total_payout_received),
    };
  });

  const { data: cycleRows } = await admin
    .schema("adashi")
    .from("cycles")
    .select("id, cycle_number, beneficiary_name, expected_pool, collected_pool, net_payout_amount, currency, status")
    .eq("group_id", groupId)
    .order("cycle_number", { ascending: true });

  const cycles = (cycleRows || []).map((c: any) => ({
    id: c.id,
    cycleNumber: c.cycle_number,
    beneficiaryName: c.beneficiary_name,
    expectedCollectionAmount: Number(c.expected_pool),
    actualCollectedAmount: Number(c.collected_pool),
    netPayoutAmount: Number(c.net_payout_amount),
    currency: c.currency,
    status: c.status,
  }));

  const cycleIds = cycles.map((c) => c.id);
  const { data: obligationRows } = cycleIds.length
    ? await admin
        .schema("adashi")
        .from("contribution_obligations")
        .select("id, cycle_id, cycle_number, member_id, amount, currency, status, due_date, paid_at")
        .in("cycle_id", cycleIds)
    : { data: [] as any[] };

  const obligationsByCycle = new Map<string, any[]>();
  for (const o of obligationRows || []) {
    const list = obligationsByCycle.get(o.cycle_id) || [];
    list.push({ id: o.id, memberId: o.member_id, amount: Number(o.amount), currency: o.currency, status: o.status, dueDate: o.due_date, paidAt: o.paid_at });
    obligationsByCycle.set(o.cycle_id, list);
  }

  return createSuccessResponse(
    {
      id: group.id,
      groupCode: group.public_reference,
      groupName: group.name,
      currency: group.currency,
      countryCode: group.country_code,
      cadence: group.frequency,
      contributionAmount: Number(group.contribution_amount),
      targetMembers: group.target_members,
      currentMembersCount: group.current_members_count,
      totalCycles: group.total_cycles,
      currentCycleNumber: group.current_cycle_number,
      totalPoolVolume: Number(group.total_pool_volume),
      status: group.status,
      startedAt: group.started_at,
      members,
      cycles: cycles.map((c) => ({ ...c, obligations: obligationsByCycle.get(c.id) || [] })),
    },
    { requestId: agent.requestId, environment: "PRODUCTION" },
  );
}
