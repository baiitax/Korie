import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/** GET /api/support/knowledge/[id]?lang=en|fr|ha */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const lang = (req.nextUrl.searchParams.get("lang") ?? "en") as "en" | "fr" | "ha";
  const article = SupportOpsEngine.getInstance().getStore().getKnowledge(params.id);
  if (!article) {
    return createErrorResponse({
      code: "KNOWLEDGE_NOT_FOUND",
      message: "This article does not exist.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }
  return createSuccessResponse(
    { ...article, body: article.body[lang] ?? article.body.en },
    { requestId: access.ctx.requestId },
  );
}
