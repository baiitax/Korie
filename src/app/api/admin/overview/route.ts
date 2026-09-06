import { NextRequest } from "next/server";
import { authorizeAdminRequest, ADMIN_ROLES } from "@/lib/security/adminAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildAdminOverview } from "@/lib/admin/overviewData";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/overview — the aggregated command-center payload.
 *
 * Every figure is read live from the database by buildAdminOverview(); each
 * section degrades to `unavailable` independently. Nothing here is cached
 * and nothing is fabricated — an unconfigured deployment answers 503 and
 * the shell renders the honest state.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req, ADMIN_ROLES);
  if (!auth.isAuthorized) {
    return Response.json(
      {
        status: "error",
        error: { code: auth.errorCode, message: auth.errorMessage },
      },
      { status: auth.httpStatus ?? 401 },
    );
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return Response.json(
      {
        status: "error",
        error: {
          code: "ADMIN_BACKEND_NOT_CONFIGURED",
          message: "The admin backend is not configured on this deployment (missing Supabase credentials).",
        },
      },
      { status: 503 },
    );
  }

  const payload = await buildAdminOverview(admin);
  return Response.json({ status: "success", data: payload });
}
