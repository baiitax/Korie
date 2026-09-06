import { NextRequest } from "next/server";
import { requireSupportAccess } from "@/lib/support/supportApi";
import { createSuccessResponse } from "@/lib/security/apiResponse";
import { listKnowledgeRows, knowledgeRowToArticle } from "@/lib/support/supportDb";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/knowledge?q=&category=&lang=
 * Articles are trilingual by structure; `lang` selects the rendered body
 * (spec §43 — never mixed into one field).
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const category = req.nextUrl.searchParams.get("category") ?? undefined;
  const lang = (req.nextUrl.searchParams.get("lang") ?? "en") as "en" | "fr" | "ha";

  const rows = await listKnowledgeRows({ status: "PUBLISHED", category });
  let items = rows.map((r) => knowledgeRowToArticle(r));
  if (q) {
    items = items.filter(
      (k) =>
        k.body.en.title.toLowerCase().includes(q) ||
        k.body.fr.title.toLowerCase().includes(q) ||
        k.body.ha.title.toLowerCase().includes(q) ||
        k.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  return createSuccessResponse(
    {
      lang,
      items: items.map((k) => ({
        id: k.id,
        category: k.category,
        audience: k.audience,
        version: k.version,
        updatedAt: k.updatedAt,
        author: k.author,
        tags: k.tags,
        helpfulCount: k.helpfulCount,
        body: k.body[lang] ?? k.body.en,
      })),
    },
    { requestId: access.ctx.requestId },
  );
}
