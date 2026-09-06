import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { getNotificationRow, markNotificationReadForOfficer } from "@/lib/support/supportDb";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/** PATCH /api/support/notifications/[id] — { read: true } */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;

  let body: { read?: boolean };
  try {
    body = await req.json();
  } catch {
    return operationalError("INVALID_JSON", "The request body must be valid JSON.", 400, access.ctx.requestId);
  }
  const n = await getNotificationRow(params.id);
  if (!n) {
    return createErrorResponse({
      code: "NOTIFICATION_NOT_FOUND",
      message: "This notification does not exist.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }
  if (body.read) await markNotificationReadForOfficer(params.id, access.ctx.actor.officerId);
  return createSuccessResponse(
    { notification: { id: n.id, type: n.type, title: n.title, body: n.body, ticketId: n.ticket_id ?? undefined, href: n.href ?? undefined, read: !!body.read, createdAt: n.created_at } },
    { requestId: access.ctx.requestId, code: "NOTIFICATION_UPDATED" },
  );
}
