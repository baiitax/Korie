// =============================================================================
// Circle privacy setting (creator only): INITIALS_ONLY (default) vs
// MEMBERS_ONLY. Sanitization is applied server-side when building view models,
// so this setting controls what PII leaves the API at all.
// =============================================================================

import { NextRequest } from "next/server";
import { AdashiStore } from "@/lib/adashi/AdashiStore";
import { AdashiGroupPrivacyMode } from "@/types/adashiEngine";
import { withCustomerAuth, badResponse, okResponse } from "@/app/api/customer/adashi/_routeHelpers";

export const dynamic = "force-dynamic";

const VALID_MODES: AdashiGroupPrivacyMode[] = ["INITIALS_ONLY", "MEMBERS_ONLY"];

export async function PUT(req: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await ctx.params;
  return withCustomerAuth(req, ["payments:write"], async ({ customerId, requestId, environment }) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return badResponse("INVALID_BODY", "Malformed request body.", requestId, 400);
    }
    const mode = String(body.privacyMode || "");
    if (!VALID_MODES.includes(mode as AdashiGroupPrivacyMode)) {
      return badResponse("INVALID_PRIVACY_MODE", "privacyMode must be INITIALS_ONLY or MEMBERS_ONLY.", requestId, 400);
    }

    const group = AdashiStore.getGroupById(groupId);
    if (!group) {
      return badResponse("GROUP_NOT_FOUND", "Circle not found.", requestId, 404);
    }
    if (group.creatorId !== customerId) {
      return badResponse("CREATOR_ONLY", "Only the circle creator can change the privacy setting.", requestId, 403);
    }

    AdashiStore.updateGroup(groupId, { privacyMode: mode as AdashiGroupPrivacyMode });
    AdashiStore.logAuditEvent({
      eventType: "CIRCLE_PRIVACY_CHANGED",
      adashiId: groupId,
      actorId: customerId,
      actorRole: "CUSTOMER",
      details: { from: group.privacyMode || "INITIALS_ONLY", to: mode },
      correlationId: `privacy-${groupId}-${Date.now()}`,
    });

    return okResponse({ groupId, privacyMode: mode }, requestId, environment);
  });
}
