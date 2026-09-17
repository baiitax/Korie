import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest, ADMIN_ROLES } from "@/lib/security/adminAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkAdminMfa, ADMIN_MFA_ENFORCEMENT_CUTOFF } from "@/lib/security/adminMfa";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/security — this admin's own MFA posture.
 *
 * Companion to /api/v1/aggregator/security's MFA card, but with no
 * organization-wide toggle: admin-portal enforcement is unconditional for
 * every account created on/after ADMIN_MFA_ENFORCEMENT_CUTOFF (see
 * adminMfa.ts) — there is no "org" that gets to opt out of protecting
 * platform-wide access, only a fixed grandfather window for accounts that
 * predate this fix.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request, ADMIN_ROLES);
  if (!auth.isAuthorized || !auth.userId) {
    return NextResponse.json(
      { status: "error", error: { code: auth.errorCode, message: auth.errorMessage } },
      { status: auth.httpStatus ?? 401 },
    );
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { status: "error", error: { code: "ADMIN_BACKEND_NOT_CONFIGURED", message: "Missing Supabase credentials." } },
      { status: 503 },
    );
  }

  const mfa = await checkAdminMfa(admin, auth.userId, auth.profileCreatedAt);

  return NextResponse.json({
    status: "ok",
    data: {
      mfa: {
        hasVerifiedFactor: mfa.hasVerifiedFactor,
        isGrandfathered: mfa.isGrandfathered,
        enforcementCutoff: ADMIN_MFA_ENFORCEMENT_CUTOFF,
        // Mutations are refused today unless one of these is true.
        canMutateWithoutEnrolling: mfa.isGrandfathered,
      },
    },
  });
}
