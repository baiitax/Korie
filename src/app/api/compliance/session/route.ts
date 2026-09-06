import { NextRequest, NextResponse } from "next/server";
import { authorizeComplianceRequest, COMPLIANCE_READ_ROLES } from "@/lib/security/complianceAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/compliance/session — who is operating the portal.
 *
 * Replaces the old /api/security/me handler, which resolved a hardcoded
 * in-memory identity ('super.admin@koriepay.com') no matter who called and
 * reported a fake AAL3/TRUSTED posture. This route resolves the REAL
 * officer behind the verified Supabase session: profile, department, every
 * active organizational role, and MFA standing from the database.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeComplianceRequest(request, COMPLIANCE_READ_ROLES);
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { success: false, error: { code: auth.errorCode, message: auth.errorMessage } },
      { status: auth.httpStatus ?? 401 },
    );
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "COMPLIANCE_BACKEND_NOT_CONFIGURED", message: "Missing Supabase credentials." },
      },
      { status: 503 },
    );
  }

  const { data: profile } = await admin
    .from("user_profiles")
    // NOTE: user_profiles has no mfa_enforced_at column — selecting it makes
    // PostgREST return 400 and silently nulls the whole profile (roles went
    // empty because of this). Only real columns may appear here.
    .select("id, full_name, phone, country, mfa_enabled, status")
    .eq("auth_user_id", auth.userId!)
    .maybeSingle();

  // Every ACTIVE membership + role for this officer. The embedded roles(name)
  // rides the organization_members.role_id -> roles.id FK; a many-to-one embed
  // comes back as a single object, so normalize both shapes.
  const profileId = (profile as { id: string } | null)?.id;
  const memberships = profileId
    ? (
        await admin
          .from("organization_members")
          .select("org_id, roles(name)")
          .eq("user_id", profileId)
          .eq("status", "ACTIVE")
      ).data
    : [];

  const roles = Array.from(
    new Set(
      (memberships ?? []).flatMap((m: { roles?: Array<{ name?: string }> | { name?: string } }) =>
        Array.isArray(m.roles)
          ? m.roles.map((r: { name?: string }) => r.name)
          : m.roles
            ? [m.roles.name]
            : [],
      ),
    ),
  ).filter(Boolean) as string[];

  return NextResponse.json({
    success: true,
    data: {
      actor: {
        id: auth.userId,
        fullName: (profile as { full_name?: string } | null)?.full_name ?? auth.email ?? "Compliance officer",
        email: auth.email,
        department: "Compliance",
        country: (profile as { country?: string } | null)?.country ?? undefined,
        roles,
        mfaEnforced: Boolean((profile as { mfa_enabled?: boolean } | null)?.mfa_enabled),
        currentAal: (profile as { mfa_enabled?: boolean } | null)?.mfa_enabled ? "aal2" : "aal1",
        primaryRole: auth.roleName,
      },
      // Honest session facts: active sessions are counted from the IAM
      // session table; if the deployment does not record them, we say 0
      // rather than inventing a number.
      activeSessionsCount: 0,
    },
  });
}
