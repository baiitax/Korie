import { NextRequest } from "next/server";
import { requireSupportAccess } from "@/lib/support/supportApi";
import { searchCustomersAndAgents } from "@/lib/support/SupportContexts";
import { createSuccessResponse } from "@/lib/security/apiResponse";
import { getSupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { listTicketRows } from "@/lib/support/supportDb";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/customers?q=
 * Customer + agent search for support, against the SAME real customers/agents
 * tables the Customer/Agency portals write (single source of truth). Search
 * results carry only masked PII (spec §56).
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const engine = getSupportOpsEngine();
  await engine.sweepAutoClose();

  const hits = await searchCustomersAndAgents(q, 50);

  const items = await Promise.all(
    hits.map(async (c) => {
      const { total } = await listTicketRows({ customerId: c.id, openOnly: true, limit: 1 });
      return { ...c, openTickets: total };
    }),
  );

  return createSuccessResponse({ items }, { requestId: access.ctx.requestId });
}
