import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { getSupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";
import { ArticleLanguage } from "@/types/supportOps";

export const dynamic = "force-dynamic";

/**
 * POST /api/support/tickets/[id]/csat
 * { rating: 1-5, comment?, language? } — resolved/closed tickets only (§59).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;

  let body: { rating?: number; comment?: string; language?: ArticleLanguage };
  try {
    body = await req.json();
  } catch {
    return operationalError("INVALID_JSON", "The request body must be valid JSON.", 400, access.ctx.requestId);
  }
  if (!body.rating || ![1, 2, 3, 4, 5].includes(body.rating)) {
    return operationalError("VALIDATION_FAILED", "rating must be an integer from 1 to 5.", 422, access.ctx.requestId);
  }

  const engine = getSupportOpsEngine();
  const result = await engine.submitCsat(params.id, {
    rating: body.rating as 1 | 2 | 3 | 4 | 5,
    comment: body.comment,
    language: body.language,
  }, access.ctx.actor);

  if (!result.ok) {
    return operationalError(result.code ?? "CSAT_FAILED", result.error ?? "Could not record satisfaction.",
      result.code === "CSAT_NOT_APPLICABLE" ? 409 : 404, access.ctx.requestId);
  }
  return createSuccessResponse({ record: result.data }, { requestId: access.ctx.requestId, status: 201, code: "CSAT_RECORDED" });
}
