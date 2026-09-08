import { NextRequest } from "next/server";
import { authenticateAgentRequest } from "@/lib/security/agentAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * POST /api/v1/agency/adashi/groups/[groupId]/start
 *
 * Creates all cycles + cycle-1 contribution obligations via the REAL
 * adashi.create_adashi_cycles() stored procedure (now fee-corrected in
 * migration 039 to read the product's own fee percentages instead of a
 * hardcoded 1.0%/0.5%). Replaces AdashiGroupLifecycleEngine.startGroup().
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: auth.errorMessage || "Unauthorized", requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const { data: group } = await admin.schema("adashi").from("groups").select("assigned_agent_id, status").eq("id", params.groupId).maybeSingle();
  if (!group) {
    return createErrorResponse({ code: "GROUP_NOT_FOUND", message: "Adashi circle not found.", requestId: agent.requestId, httpStatus: 404 });
  }
  if (group.assigned_agent_id !== agent.agentId) {
    return createErrorResponse({ code: "FORBIDDEN", message: "You do not manage this circle.", requestId: agent.requestId, httpStatus: 403 });
  }

  const { data, error } = await admin.schema("adashi").rpc("create_adashi_cycles", {
    p_group_id: params.groupId,
    p_actor_id: agent.agentId,
  });

  if (error) {
    return createErrorResponse({ code: "START_FAILED", message: "Could not start this circle. Ensure the rotation allocation has been generated first.", requestId: agent.requestId, httpStatus: 422 });
  }

  return createSuccessResponse({ result: data }, { code: "GROUP_STARTED", message: "Circle is now active. Cycle 1 contributions are open.", requestId: agent.requestId, environment: "PRODUCTION" });
}
