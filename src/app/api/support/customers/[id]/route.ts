import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { resolveCustomer360 } from "@/lib/support/SupportContexts";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { insertAuditRow } from "@/lib/support/supportDb";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

function auditId(): string {
  return `AUD-SUP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * GET /api/support/customers/[id]?unmask=1
 * Customer 360 (spec §22/§23): identity + KYC + risk, accounts XOF-first
 * (never USD), live transactions, open tickets/disputes — all read from the
 * SAME customers/wallets/customer_transactions (or agents/agency_transactions)
 * tables the Customer/Agency portals write. PII masked by default; unmask=1
 * requires the unmask_pii capability and is AUDITED (spec §55).
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

  const view = await resolveCustomer360(params.id, { unmaskPii: wantsUnmask });
  if (!view) {
    return createErrorResponse({
      code: "CUSTOMER_NOT_FOUND",
      message: "This customer could not be found.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }

  await insertAuditRow({
    id: auditId(),
    officer_id: access.ctx.actor.officerId,
    officer_name: access.ctx.actor.name,
    officer_role: access.ctx.actor.role,
    action: wantsUnmask ? "PII_UNMASKED" : "CUSTOMER_360_VIEWED",
    entity_type: "CUSTOMER",
    entity_id: params.id,
    details: wantsUnmask
      ? `Unmasked PII for ${view.customer.name} (${view.source}).`
      : `Viewed Customer 360 for ${view.customer.name} (masked PII, ${view.source}).`,
    jurisdiction: view.customer.country === "NE" ? "NE" : "NG",
  });

  return createSuccessResponse(view, { requestId: access.ctx.requestId });
}
