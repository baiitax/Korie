import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * GET /api/auth/session/resolve
 *
 * Given a real Supabase Bearer token, tells the caller which real KoriePay
 * persona table it belongs to — public.customers, public.agents,
 * public.merchant_staff_users, public.aggregator_staff_users, or
 * public.support_officers — and for internal staff (user_profiles +
 * organization_members) which operator portal their ACTIVE role unlocks
 * (/compliance, /admin), so the single central /login page can route to the
 * correct dashboard without the frontend guessing or the backend
 * fabricating a role. If more than one persona somehow matches the same
 * auth user, customer takes precedence (the common case is an individual
 * who is also a wallet customer), then agent, then merchant, then
 * aggregator, then support, then staff.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return createErrorResponse({ code: "UNAUTHORIZED_MISSING_TOKEN", message: "Missing session token.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 401 });
  }
  const accessToken = authHeader.replace("Bearer ", "").trim();
  const admin = getSupabaseAdminClient();

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return createErrorResponse({ code: "UNAUTHORIZED_INVALID_SESSION", message: "Invalid or expired session.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 401 });
  }
  const authUserId = userData.user.id;

  const { data: customerRow } = await admin.from("customers").select("id").eq("auth_user_id", authUserId).maybeSingle();
  if (customerRow) {
    return createSuccessResponse({ role: "CUSTOMER", redirectTo: "/customer" }, { requestId: `KP-REQ-${Date.now()}`, environment: "PRODUCTION" });
  }

  const { data: agentRow } = await admin.from("agents").select("id, status").eq("auth_user_id", authUserId).maybeSingle();
  if (agentRow) {
    return createSuccessResponse({ role: "AGENT", redirectTo: "/agent", status: agentRow.status }, { requestId: `KP-REQ-${Date.now()}`, environment: "PRODUCTION" });
  }

  const { data: staffRow } = await admin
    .from("merchant_staff_users")
    .select("id, merchant_profiles(status)")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (staffRow) {
    const merchantProfile: any = Array.isArray(staffRow.merchant_profiles) ? staffRow.merchant_profiles[0] : staffRow.merchant_profiles;
    return createSuccessResponse({ role: "MERCHANT", redirectTo: "/merchant", status: merchantProfile?.status }, { requestId: `KP-REQ-${Date.now()}`, environment: "PRODUCTION" });
  }

  const { data: aggregatorStaffRow } = await admin
    .from("aggregator_staff_users")
    .select("id, aggregators(status)")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (aggregatorStaffRow) {
    const aggregatorRow: any = Array.isArray(aggregatorStaffRow.aggregators) ? aggregatorStaffRow.aggregators[0] : aggregatorStaffRow.aggregators;
    return createSuccessResponse({ role: "AGGREGATOR", redirectTo: "/aggregator", status: aggregatorRow?.status }, { requestId: `KP-REQ-${Date.now()}`, environment: "PRODUCTION" });
  }

  // Support officers live in their own table, resolved by auth_user_id.
  const { data: supportRow } = await admin
    .from("support_officers")
    .select("id, status")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (supportRow) {
    return createSuccessResponse({ role: "SUPPORT", redirectTo: "/support", status: supportRow.status }, { requestId: `KP-REQ-${Date.now()}`, environment: "PRODUCTION" });
  }

  // Internal workforce personas. Staff live in user_profiles +
  // organization_members (one ACTIVE role per user), not in the self-serve
  // persona tables above. Route them to the operator portal their role
  // actually unlocks — the portal's own server-side gate re-verifies the
  // role on every request, so this is a redirect hint, not an authorization.
  const { data: workforceRow } = await admin
    .from("user_profiles")
    .select("id, organization_members(status, roles(name))")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (workforceRow) {
    const memberships: any[] = Array.isArray(workforceRow.organization_members)
      ? workforceRow.organization_members
      : workforceRow.organization_members
        ? [workforceRow.organization_members]
        : [];
    const roleNames = new Set<string>(
      memberships
        .filter((m) => m?.status === "ACTIVE")
        .flatMap((m) => {
          const r = m?.roles;
          const arr = Array.isArray(r) ? r : r ? [r] : [];
          return arr.map((x: any) => x?.name).filter(Boolean) as string[];
        }),
    );
    if (roleNames.has("COMPLIANCE_OFFICER")) {
      return createSuccessResponse(
        { role: "COMPLIANCE_OFFICER", redirectTo: "/compliance" },
        { requestId: `KP-REQ-${Date.now()}`, environment: "PRODUCTION" },
      );
    }
    if (["SUPER_ADMIN", "ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"].some((r) => roleNames.has(r))) {
      return createSuccessResponse(
        { role: "ADMIN", redirectTo: "/admin" },
        { requestId: `KP-REQ-${Date.now()}`, environment: "PRODUCTION" },
      );
    }
  }

  return createErrorResponse({ code: "NO_PROFILE_FOUND", message: "No KoriePay profile is associated with this account.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 404 });
}
