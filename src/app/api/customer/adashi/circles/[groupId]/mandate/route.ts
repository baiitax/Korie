// =============================================================================
// Mandate toggle (self only): authorizes / revokes auto-debit for the
// session customer's own membership in a circle.
// =============================================================================

import { NextRequest } from "next/server";
import { AdashiStore } from "@/lib/adashi/AdashiStore";
import { getCircleMembership } from "@/lib/customer/AdashiCustomerEngine";
import { withCustomerAuth, badResponse, okResponse } from "@/app/api/customer/adashi/_routeHelpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await ctx.params;
  return withCustomerAuth(req, ["payments:write"], async ({ customerId, requestId, environment }) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return badResponse("INVALID_BODY", "Malformed request body.", requestId, 400);
    }
    const authorize = Boolean(body.authorize);

    const membership = getCircleMembership(customerId, groupId);
    if (!membership) {
      return badResponse("NOT_A_MEMBER", "You are not a member of this circle.", requestId, 403);
    }

    AdashiStore.updateMember(membership.member.id, {
      mandateAuthorized: authorize,
      mandateAuthorizationDate: authorize ? new Date().toISOString() : undefined,
    });
    AdashiStore.logAuditEvent({
      eventType: authorize ? "MANDATE_AUTHORIZED" : "MANDATE_REVOKED",
      adashiId: groupId,
      actorId: customerId,
      actorRole: "CUSTOMER",
      details: { memberId: membership.member.id },
      correlationId: `mandate-${groupId}-${Date.now()}`,
    });

    return okResponse({ groupId, mandateAuthorized: authorize }, requestId, environment);
  });
}
