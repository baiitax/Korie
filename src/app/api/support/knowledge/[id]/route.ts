import { NextRequest } from "next/server";
import { requireSupportAccess } from "@/lib/support/supportApi";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { getKnowledgeRow, knowledgeRowToArticle } from "@/lib/support/supportDb";

export const dynamic = "force-dynamic";

/** GET /api/support/knowledge/[id]?lang=en|fr|ha */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const lang = (req.nextUrl.searchParams.get("lang") ?? "en") as "en" | "fr" | "ha";
  const row = await getKnowledgeRow(params.id);
  if (!row) {
    return createErrorResponse({
      code: "KNOWLEDGE_NOT_FOUND",
      message: "This article does not exist.",
      requestId: access.ctx.requestId,
      httpStatus: 404,
    });
  }
  const article = knowledgeRowToArticle(row);
  return createSuccessResponse(
    { ...article, body: article.body[lang] ?? article.body.en },
    { requestId: access.ctx.requestId },
  );
}
