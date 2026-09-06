import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { resolveCustomer360 } from "@/lib/support/SupportContexts";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { SupportOpsStore } from "@/lib/support/SupportOpsStore";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/customers/[id]?unmask=1
 * Customer 360 (spec §22/§23): identity + KYC + risk (engine), accounts
 * XOF-first (engine wallets, never USD), live transactions (engine), open
 * tickets/disputes (support store). PII masked by default; unmask=1 requires
 * the unmask_pii capability and is AUDITED (spec §55).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "view_customer_360")) {
    return operationalError("FORBIDDEN", "Your role cannot view customer profiles.", 403, access.ctx.requestId);
  }

  const wantsUnmask = req.nextUrl.searchParams.get("unmask") === "1";
  if (wantsUnmask && !hasCapability(access.ctx.actor.role, "unmask_pii")) {
    return operationalError("FORBIDDEN_UNMASK", "Your role cannot unmask customer PII.", 403, access.ctx.requestId);
  }

  const view = resolveCustomer360(params.id, access.ctx.actor.role, { unmaskPii: wantsUnmask });
  if (!view) {
    return createErrorResponse({
      code: "CUSTOMER_NOT_FOUND",
      message: "This customer could not be found.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }

  if (wantsUnmask) {
    SupportOpsStore.getInstance().addAudit({
      id: `AUD-SUP-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      officerId: access.ctx.actor.officerId,
      officerName: access.ctx.actor.name,
      officerRole: access.ctx.actor.role,
      action: "PII_UNMASKED",
      entityType: "CUSTOMER",
      entityId: params.id,
      details: `Unmasked PII for ${view.customer.name} (${view.source}).`,
      jurisdiction: view.customer.country,
    });
  } else {
    // Viewed (masked) is still a meaningful access signal for the audit trail.
    SupportOpsStore.getInstance().addAudit({
      id: `AUD-SUP-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      officerId: access.ctx.actor.officerId,
      officerName: access.ctx.actor.name,
      officerRole: access.ctx.actor.role,
      action: "CUSTOMER_360_VIEWED",
      entityType: "CUSTOMER",
      entityId: params.id,
      details: `Viewed Customer 360 for ${view.customer.name} (masked PII, ${view.source}).`,
      jurisdiction: view.customer.country,
    });
  }

  return createSuccessResponse(view, { requestId: access.ctx.requestId });
}
