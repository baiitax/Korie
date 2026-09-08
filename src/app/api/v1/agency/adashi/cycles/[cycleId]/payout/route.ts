import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { authenticateAgentRequest } from "@/lib/security/agentAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * POST /api/v1/agency/adashi/cycles/[cycleId]/payout
 *
 * Initiates a cycle's beneficiary payout via public.post_adashi_payout()
 * (migration 038). Fees are recomputed from the group's real product row
 * (never a client-supplied number). Below the product's
 * payout_maker_checker_threshold it executes immediately and credits the
 * beneficiary's real wallet; at/above it, it is staged PENDING and a
 * compliance/admin officer must call authorize_adashi_payout() before any
 * money moves — never a fake "payout initiated" success for a high-value
 * disbursement that hasn't actually happened.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { cycleId: string } }) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: auth.errorMessage || "Unauthorized", requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();
  const cycleId = params.cycleId;

  const { data: cycle } = await admin.schema("adashi").from("cycles").select("group_id").eq("id", cycleId).maybeSingle();
  if (!cycle) {
    return createErrorResponse({ code: "CYCLE_NOT_FOUND", message: "Cycle not found.", requestId: agent.requestId, httpStatus: 404 });
  }
  const { data: group } = await admin.schema("adashi").from("groups").select("assigned_agent_id").eq("id", cycle.group_id).maybeSingle();
  if (!group || group.assigned_agent_id !== agent.agentId) {
    return createErrorResponse({ code: "FORBIDDEN", message: "You do not manage this circle.", requestId: agent.requestId, httpStatus: 403 });
  }

  const reference = `KP-${new Date().getFullYear()}-ADAPAY-${randomUUID().split("-")[0].toUpperCase()}`;
  const idempotencyKey = req.headers.get("idempotency-key") || req.headers.get("Idempotency-Key") || `idem-${reference}`;

  const { data, error } = await admin.rpc("post_adashi_payout", {
    p_cycle_id: cycleId,
    p_maker_id: agent.agentId,
    p_maker_role: "AGENT",
    p_idempotency_key: idempotencyKey,
    p_payment_reference: reference,
  });

  if (error) {
    const message = error.message || "";
    if (message.includes("CYCLE_NOT_READY_FOR_PAYOUT")) {
      return createErrorResponse({ code: "CYCLE_NOT_READY", message: "This cycle's contributions are not fully collected yet.", requestId: agent.requestId, httpStatus: 422 });
    }
    return createErrorResponse({ code: "PAYOUT_INITIATION_FAILED", message: "Could not initiate this payout.", requestId: agent.requestId, httpStatus: 500 });
  }

  const isPending = data.status === "PENDING";
  return createSuccessResponse(
    {
      payout: {
        id: data.id,
        status: data.status,
        grossAmount: Number(data.gross_amount),
        netDisbursedAmount: Number(data.net_disbursed_amount),
        currency: data.currency,
        requiresMakerChecker: data.requires_maker_checker,
      },
    },
    {
      code: isPending ? "PAYOUT_PENDING_APPROVAL" : "PAYOUT_COMPLETED",
      message: isPending
        ? "This payout exceeds the maker-checker threshold and is now pending a second officer's approval before funds move."
        : "Payout completed. The beneficiary's wallet has been credited.",
      requestId: agent.requestId,
      environment: "PRODUCTION",
    },
  );
}
