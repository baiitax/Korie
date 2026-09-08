import { NextRequest } from "next/server";
import { authenticateAgentRequest } from "@/lib/security/agentAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * POST /api/v1/agency/adashi/groups/[groupId]/lock
 *
 * Calls the REAL adashi.lock_membership() stored procedure (migration 027)
 * — quorum + consent checks happen inside the DB, not in the JS engine.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: auth.errorMessage || "Unauthorized", requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const { data: group } = await admin.schema("adashi").from("groups").select("assigned_agent_id").eq("id", params.groupId).maybeSingle();
  if (!group) {
    return createErrorResponse({ code: "GROUP_NOT_FOUND", message: "Adashi circle not found.", requestId: agent.requestId, httpStatus: 404 });
  }
  if (group.assigned_agent_id !== agent.agentId) {
    return createErrorResponse({ code: "FORBIDDEN", message: "You do not manage this circle.", requestId: agent.requestId, httpStatus: 403 });
  }

  // adashi.lock_membership lives in the `adashi` schema — must call it via
  // .schema('adashi').rpc(...), not the default public-schema rpc().
  const { data, error } = await admin.schema("adashi").rpc("lock_membership", {
    p_group_id: params.groupId,
    p_actor_id: agent.agentId,
  });
  if (error) {
    const message = error.message || "";
    if (message.includes("Quorum not met")) {
      return createErrorResponse({ code: "QUORUM_NOT_MET", message: "Not enough members have joined yet.", requestId: agent.requestId, httpStatus: 422 });
    }
    if (message.includes("have not accepted")) {
      return createErrorResponse({ code: "CONSENT_PENDING", message: "Some members have not yet accepted their contribution mandate.", requestId: agent.requestId, httpStatus: 422 });
    }
    return createErrorResponse({ code: "LOCK_FAILED", message: "Could not lock membership for this circle.", requestId: agent.requestId, httpStatus: 500 });
  }

  return createSuccessResponse({ result: data }, { code: "MEMBERSHIP_LOCKED", message: "Membership locked. You can now generate the rotation allocation.", requestId: agent.requestId, environment: "PRODUCTION" });
}
