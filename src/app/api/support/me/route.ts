import { NextRequest } from "next/server";
import { requireSupportAccess } from "@/lib/support/supportApi";
import { createSuccessResponse } from "@/lib/security/apiResponse";
import { capabilitiesFor } from "@/lib/support/SupportPermissions";
import { activeTicketCountsByOfficer } from "@/lib/support/supportDb";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/me
 *
 * Minimal identity endpoint used right after a real Supabase sign-in (and on
 * every support-shell mount) to resolve exactly who is acting. Identity
 * comes only from the validated Bearer token — there is no client-supplied
 * officer id anywhere in this request.
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const counts = await activeTicketCountsByOfficer();
  const officer = {
    ...access.ctx.officer,
    activeTicketCount: counts.get(access.ctx.officer.id) ?? 0,
    capabilities: capabilitiesFor(access.ctx.officer.role),
  };

  return createSuccessResponse({ officer }, { requestId: access.ctx.requestId });
}
