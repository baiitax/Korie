import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { authenticateAgentRequest } from "@/lib/security/agentAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * POST /api/v1/agency/adashi/obligations/[obligationId]/collect
 *
 * Agent physically collects a member's cash contribution. Real
 * double-entry via public.post_adashi_contribution_agent_collect()
 * (migration 039): debits the agent's own CASH_IN_HAND ledger account and
 * credits the group's real escrow account — the agent is now on the hook
 * for that physical cash exactly like any other agency cash-in.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { obligationId: string } }) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: auth.errorMessage || "Unauthorized", requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();
  const obligationId = params.obligationId;

  const reference = `KP-${new Date().getFullYear()}-ADAAGT-${randomUUID().split("-")[0].toUpperCase()}`;
  const idempotencyKey = req.headers.get("idempotency-key") || req.headers.get("Idempotency-Key") || `idem-${reference}`;

  const { data, error } = await admin.rpc("post_adashi_contribution_agent_collect", {
    p_obligation_id: obligationId,
    p_agent_id: agent.agentId,
    p_idempotency_key: idempotencyKey,
    p_payment_reference: reference,
  });

  if (error) {
    const message = error.message || "";
    if (message.includes("AGENT_NOT_ASSIGNED_TO_GROUP")) {
      return createErrorResponse({ code: "FORBIDDEN", message: "You do not manage the circle this contribution belongs to.", requestId: agent.requestId, httpStatus: 403 });
    }
    if (message.includes("AGENT_FLOAT_NOT_PROVISIONED")) {
      return createErrorResponse({ code: "AGENT_FLOAT_NOT_PROVISIONED", message: "Your agent cash account has not been provisioned yet. Contact support.", requestId: agent.requestId, httpStatus: 409 });
    }
    if (message.includes("OBLIGATION_NOT_PAYABLE_IN_STATUS")) {
      return createErrorResponse({ code: "OBLIGATION_NOT_PAYABLE", message: "This contribution is not currently payable.", requestId: agent.requestId, httpStatus: 409 });
    }
    if (message.includes("CONTRIBUTION_ALREADY_IN_FLIGHT")) {
      return createErrorResponse({ code: "PAYMENT_IN_FLIGHT", message: "This collection is already being processed.", requestId: agent.requestId, httpStatus: 409 });
    }
    return createErrorResponse({ code: "COLLECTION_FAILED", message: "Could not record this collection. Please try again.", requestId: agent.requestId, httpStatus: 502 });
  }

  return createSuccessResponse(
    { obligation: { id: data.id, status: data.status, amount: Number(data.amount), currency: data.currency, paidAt: data.paid_at } },
    { code: "CONTRIBUTION_COLLECTED", message: "Cash contribution recorded and posted to the group escrow.", requestId: agent.requestId, environment: "PRODUCTION" },
  );
}
