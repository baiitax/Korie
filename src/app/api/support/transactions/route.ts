import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { SupportOpsStore } from "@/lib/support/SupportOpsStore";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/transactions?q=
 * Transaction search across provider traces (id / reference / counterparty).
 * Search respects the same capability gate as direct lookup (spec §56):
 * officers without view_transactions get nothing.
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "view_transactions")) {
    return operationalError("FORBIDDEN", "Your role cannot search transactions.", 403, access.ctx.requestId);
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const store = SupportOpsStore.getInstance();
  const rows = Object.values(store.transactionTraces)
    .filter((t) =>
      !q ||
      t.transactionId.toLowerCase().includes(q) ||
      t.reference.toLowerCase().includes(q) ||
      t.originEntity.toLowerCase().includes(q) ||
      t.destinationEntity.toLowerCase().includes(q) ||
      t.providerReference.toLowerCase().includes(q),
    )
    .slice(0, 50);

  return createSuccessResponse(
    {
      items: rows.map((t) => ({
        transactionId: t.transactionId,
        reference: t.reference,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        timestamp: t.timestamp,
        origin: t.originEntity,
        destination: t.destinationEntity,
      })),
    },
    { requestId: access.ctx.requestId },
  );
}
