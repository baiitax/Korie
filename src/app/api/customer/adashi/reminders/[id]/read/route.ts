// =============================================================================
// Mark an outbox reminder as read (owner only).
// =============================================================================

import { NextRequest } from "next/server";
import { emailNotificationEngine } from "@/lib/email/EmailNotificationEngine";
import { withCustomerAuth, badResponse, okResponse } from "@/app/api/customer/adashi/_routeHelpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withCustomerAuth(req, ["payments:read"], async ({ customerId, requestId, environment }) => {
    const marked = emailNotificationEngine.markRead(id, customerId);
    if (!marked) {
      return badResponse("REMINDER_NOT_FOUND", "Reminder not found for this profile.", requestId, 404);
    }
    return okResponse({ id, read: true }, requestId, environment);
  });
}
