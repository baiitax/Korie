import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { getSupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";
import { DisputeCategory } from "@/types/supportOps";
import { TicketPriority } from "@/types/support";
import { listDisputeRows, disputeRowToDispute } from "@/lib/support/supportDb";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/disputes?status=&category=
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const q = new URLSearchParams(req.nextUrl.search);
  const status = q.get("status") ?? undefined;
  const category = q.get("category") ?? undefined;
  const rows = await listDisputeRows({ status, category, limit: 500 });
  const items = await Promise.all(rows.map((d) => disputeRowToDispute(d)));

  return createSuccessResponse(
    { items, total: items.length },
    { requestId: access.ctx.requestId },
  );
}

/**
 * POST /api/support/disputes
 * Open a dispute from a ticket (or directly). Link the transaction; the
 * decision owner is derived by category (support never self-adjudicates).
 */
export async function POST(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "create_dispute")) {
    return operationalError("FORBIDDEN", "Your role cannot open disputes.", 403, access.ctx.requestId);
  }

  let body: {
    ticketId?: string;
    category?: DisputeCategory;
    transactionReference?: string;
    customerId?: string;
    customerName?: string;
    claim?: string;
    claimAmount?: number;
    currency?: "NGN" | "XOF";
    priority?: TicketPriority;
    jurisdiction?: string;
  };
  try {
    body = await req.json();
  } catch {
    return operationalError("INVALID_JSON", "The request body must be valid JSON.", 400, access.ctx.requestId);
  }

  const engine = getSupportOpsEngine();
  const result = await engine.createDispute(
    {
      ticketId: body.ticketId,
      category: body.category ?? "OTHER",
      transactionReference: body.transactionReference ?? "",
      customerId: body.customerId ?? "",
      customerName: body.customerName ?? "Unknown",
      claim: body.claim ?? "",
      claimAmount: body.claimAmount ?? 0,
      currency: body.currency ?? "NGN",
      priority: body.priority,
      jurisdiction: (body.jurisdiction as never) ?? "NG",
    },
    access.ctx.actor,
  );
  if (!result.ok) {
    return operationalError(result.code ?? "DISPUTE_FAILED", result.error ?? "Could not open the dispute.",
      result.code === "VALIDATION_FAILED" ? 422 : result.code === "FORBIDDEN" ? 403 : 500,
      access.ctx.requestId);
  }
  return createSuccessResponse({ dispute: result.data }, { requestId: access.ctx.requestId, status: 201, code: "DISPUTE_OPENED" });
}
