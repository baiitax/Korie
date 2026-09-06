import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";
import { TicketMessage } from "@/types/support";

export const dynamic = "force-dynamic";

/**
 * POST /api/support/tickets/[id]/messages
 * { content, internal?, macroId?, senderType?: 'AGENT'|'CUSTOMER' }
 *
 * - Agent replies / internal notes: RBAC-checked by the engine.
 * - Customer replies: resume a paused ticket + un-pause the SLA clock.
 * - Internal notes are stored with isInternalNote=true and are NEVER included
 *   in any customer-facing projection (spec §19).
 * - Idempotent via idempotency-key header or body.idempotencyKey (§72).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;

  let body: { content?: string; internal?: boolean; macroId?: string; senderType?: "AGENT" | "CUSTOMER"; idempotencyKey?: string };
  try {
    body = await req.json();
  } catch {
    return operationalError("INVALID_JSON", "The request body must be valid JSON.", 400, access.ctx.requestId);
  }

  const engine = SupportOpsEngine.getInstance();
  const result = engine.addMessage(
    params.id,
    {
      content: body.content ?? "",
      internal: body.internal,
      macroId: body.macroId,
      senderType: body.senderType ?? "AGENT",
      actor: access.ctx.actor,
    },
    (req.headers.get("idempotency-key") as string | null) ?? body.idempotencyKey,
  );

  if (!result.ok) {
    return operationalError(result.code ?? "MESSAGE_FAILED", result.error ?? "Could not post the message.",
      result.code === "FORBIDDEN" ? 403 : result.code === "VALIDATION_FAILED" ? 422 : 404,
      access.ctx.requestId);
  }

  // Re-read so the response includes the refreshed SLA + message count.
  const ticket = engine.getStore().getTicket(params.id)!;
  return createSuccessResponse(
    { message: result.data as TicketMessage, ticket, sla: engine.computeSla(ticket) },
    { requestId: access.ctx.requestId, status: 201, code: "MESSAGE_POSTED" },
  );
}
