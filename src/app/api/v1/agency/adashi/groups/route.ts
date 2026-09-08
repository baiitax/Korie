import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { authenticateAgentRequest } from "@/lib/security/agentAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * GET  /api/v1/agency/adashi/groups  — circles this agent is assigned to.
 * POST /api/v1/agency/adashi/groups  — create a new circle from a real
 *      adashi.products row. Replaces AdashiGroupLifecycleEngine.createGroup
 *      (in-memory) and the hardcoded 'usr-agent-001' identity previously
 *      sent from the browser — the agent identity here comes exclusively
 *      from the verified Supabase session.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: auth.errorMessage || "Unauthorized", requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .schema("adashi")
    .from("groups")
    .select("id, public_reference, name, currency, country_code, contribution_amount, frequency, target_members, current_members_count, total_cycles, current_cycle_number, total_pool_volume, status, started_at")
    .eq("assigned_agent_id", agent.agentId)
    .order("created_at", { ascending: false });

  if (error) {
    return createErrorResponse({ code: "GROUPS_LOOKUP_FAILED", message: "Unable to load your Adashi circles.", requestId: agent.requestId, httpStatus: 500 });
  }

  const groups = (data || []).map((g: any) => ({
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
  }));

  return createSuccessResponse({ groups }, { requestId: agent.requestId, environment: "PRODUCTION" });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: auth.errorMessage || "Unauthorized", requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: "INVALID_BODY", message: "Malformed request body.", requestId: agent.requestId, httpStatus: 400 });
  }

  const productId = String(body.productId || "");
  const groupName = String(body.groupName || "").trim();
  const targetMembers = Number(body.targetMembers);

  if (!productId || !groupName) {
    return createErrorResponse({ code: "MISSING_FIELDS", message: "Product and circle name are required.", requestId: agent.requestId, httpStatus: 400 });
  }
  if (!Number.isFinite(targetMembers) || targetMembers < 3 || targetMembers > 20) {
    return createErrorResponse({ code: "INVALID_TARGET_MEMBERS", message: "Target members must be between 3 and 20.", requestId: agent.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data: product, error: productError } = await admin
    .schema("adashi")
    .from("products")
    .select("id, default_currency, country_code, minimum_members, maximum_members, contribution_amount, contribution_frequency, grace_period_hours, status")
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product || product.status !== "ACTIVE") {
    return createErrorResponse({ code: "PRODUCT_NOT_FOUND", message: "Selected Adashi product is not available.", requestId: agent.requestId, httpStatus: 404 });
  }
  if (targetMembers < product.minimum_members || targetMembers > product.maximum_members) {
    return createErrorResponse({
      code: "TARGET_MEMBERS_OUT_OF_RANGE",
      message: `This product requires between ${product.minimum_members} and ${product.maximum_members} members.`,
      requestId: agent.requestId,
      httpStatus: 422,
    });
  }

  const legalEntityCode = product.country_code === "NG" ? "KP-NG" : "KP-NE";
  const escrowAccount = product.default_currency === "NGN" ? "ADASHI-ESCROW-NGN" : "ADASHI-ESCROW-XOF";
  const publicReference = `ADA-${product.country_code}-${new Date().getFullYear()}-${randomUUID().split("-")[0].toUpperCase()}`;

  const { data: group, error: groupError } = await admin
    .schema("adashi")
    .from("groups")
    .insert({
      public_reference: publicReference,
      product_id: product.id,
      product_version: 1,
      creator_id: agent.agentId,
      creator_role: "AGENT",
      assigned_agent_id: agent.agentId,
      legal_entity_code: legalEntityCode,
      country_code: product.country_code,
      currency: product.default_currency,
      name: groupName,
      contribution_amount: product.contribution_amount,
      frequency: product.contribution_frequency,
      target_members: targetMembers,
      min_members: product.minimum_members,
      grace_period_hours: product.grace_period_hours,
      total_cycles: targetMembers,
      escrow_vault_account_id: escrowAccount,
      status: "OPEN_FOR_MEMBERS",
    })
    .select("id, public_reference, name, currency, country_code, contribution_amount, frequency, target_members, status")
    .single();

  if (groupError || !group) {
    return createErrorResponse({ code: "GROUP_CREATE_FAILED", message: "Could not create the Adashi circle. Please try again.", requestId: agent.requestId, httpStatus: 500 });
  }

  await admin.schema("adashi").from("group_events").insert({
    group_id: group.id,
    event_type: "GROUP_CREATED",
    previous_status: null,
    new_status: "OPEN_FOR_MEMBERS",
    actor_id: agent.agentId,
    actor_role: "AGENT",
    payload_json: { product_id: product.id, target_members: targetMembers },
    correlation_id: randomUUID(),
  });

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
        status: group.status,
      },
    },
    { code: "GROUP_CREATED", message: "Adashi circle created. Invite members to begin.", requestId: agent.requestId, environment: "PRODUCTION" },
  );
}
