import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { SupportOpsStore } from "@/lib/support/SupportOpsStore";
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
  const store = SupportOpsStore.getInstance();
  const n = store.notifications.find((x) => x.id === params.id);
  if (!n) {
    return createErrorResponse({
      code: "NOTIFICATION_NOT_FOUND",
      message: "This notification does not exist.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }
  if (body.read) store.markNotificationRead(params.id);
  return createSuccessResponse({ notification: n }, { requestId: access.ctx.requestId, code: "NOTIFICATION_UPDATED" });
}
