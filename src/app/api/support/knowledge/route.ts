import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { SupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { createSuccessResponse } from "@/lib/security/apiResponse";

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
  const category = req.nextUrl.searchParams.get("category");
  const lang = (req.nextUrl.searchParams.get("lang") ?? "en") as "en" | "fr" | "ha";

  let rows = SupportOpsEngine.getInstance().getStore().knowledge.filter((k) => k.status === "PUBLISHED");
  if (category) rows = rows.filter((k) => k.category === category);
  if (q) {
    rows = rows.filter(
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
      items: rows.map((k) => ({
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
