import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { getSupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/search?q=
 * Global command search (§95): customers, tickets, transactions, disputes,
 * escalations, knowledge. Each kind is gated by the same capability as its
 * direct routes (spec §56 — search cannot bypass authorization).
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return createSuccessResponse(
      { customers: [], tickets: [], transactions: [], disputes: [], escalations: [], knowledge: [] },
      { requestId: access.ctx.requestId },
    );
  }

  const results = await getSupportOpsEngine().search(q);
  const role = access.ctx.actor.role;

  return createSuccessResponse(
    {
      customers: hasCapability(role, "view_customer_360") ? results.customers : [],
      tickets: results.tickets,
      transactions: hasCapability(role, "view_transactions") ? results.transactions : [],
      disputes: results.disputes,
      escalations: results.escalations,
      knowledge: results.knowledge,
    },
    { requestId: access.ctx.requestId },
  );
}

void operationalError;
