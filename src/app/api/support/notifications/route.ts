import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { SupportOpsStore } from "@/lib/support/SupportOpsStore";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/** GET /api/support/notifications?unread=1 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const unread = req.nextUrl.searchParams.get("unread") === "1";
  const store = SupportOpsStore.getInstance();
  const rows = store.notificationsForOfficer(access.ctx.actor.officerId).filter((n) => (unread ? !n.read : true));
  return createSuccessResponse(
    { items: rows.slice(0, 50), unreadCount: store.notificationsForOfficer(access.ctx.actor.officerId).filter((n) => !n.read).length },
    { requestId: access.ctx.requestId },
  );
}

void operationalError;
