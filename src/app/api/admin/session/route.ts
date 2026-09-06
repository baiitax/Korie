import { NextRequest } from "next/server";
import { authorizeAdminRequest, ADMIN_ROLES } from "@/lib/security/adminAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/session — "who am I" for the admin shell.
 *
 * Returns the authenticated administrator's identity + database-resolved
 * role, or the honest error state (401/403/503) the shell renders as a
 * sign-in / not-authorized screen.
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

  return Response.json({
    status: "success",
    data: {
      userId: auth.userId,
      orgId: auth.orgId,
      role: auth.roleName,
      email: auth.email,
    },
  });
}
