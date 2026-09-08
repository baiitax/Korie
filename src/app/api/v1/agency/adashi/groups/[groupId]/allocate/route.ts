import { NextRequest } from "next/server";
import { authenticateAgentRequest } from "@/lib/security/agentAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * POST /api/v1/agency/adashi/groups/[groupId]/allocate
 *
 * Generates the deterministic HMAC-SHA256 rotation allocation via the REAL
 * adashi.generate_adashi_allocation() stored procedure — replaces the
 * in-memory AdashiRotationAllocationEngine.generateRotation(), which
 * produced a rotation nobody's ledger ever knew about.
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

  const { data, error } = await admin.schema("adashi").rpc("generate_adashi_allocation", {
    p_group_id: params.groupId,
    p_actor_id: agent.agentId,
    p_seed_salt: null,
  });

  if (error) {
    const message = error.message || "";
    if (message.includes("Must be MEMBERSHIP_LOCKED")) {
      return createErrorResponse({ code: "MEMBERSHIP_NOT_LOCKED", message: "Lock membership before generating the rotation.", requestId: agent.requestId, httpStatus: 422 });
    }
    return createErrorResponse({ code: "ALLOCATION_FAILED", message: "Could not generate the rotation allocation.", requestId: agent.requestId, httpStatus: 500 });
  }

  return createSuccessResponse({ result: data }, { code: "ALLOCATION_GENERATED", message: "Rotation allocation generated and published.", requestId: agent.requestId, environment: "PRODUCTION" });
}
