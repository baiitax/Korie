import { NextRequest } from "next/server";
import { requireSupportAccess } from "@/lib/support/supportApi";
import { notificationsForOfficer } from "@/lib/support/supportDb";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/** GET /api/support/notifications?unread=1 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const unread = req.nextUrl.searchParams.get("unread") === "1";
  const [items, all] = await Promise.all([
    notificationsForOfficer(access.ctx.actor.officerId, unread, 50),
    notificationsForOfficer(access.ctx.actor.officerId, true, 200),
  ]);
  return createSuccessResponse(
    { items, unreadCount: all.length },
    { requestId: access.ctx.requestId },
  );
}
