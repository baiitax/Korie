import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * GET /api/auth/session/resolve
 *
 * Given a real Supabase Bearer token, tells the caller which real KoriePay
 * persona table it belongs to — public.customers, public.agents, or
 * public.merchant_staff_users — so a single generic /login page can route
 * to the correct dashboard (/customer, /agent, /merchant) without the
 * frontend guessing or the backend fabricating a role. If more than one
 * persona somehow matches the same auth user, customer takes precedence
 * (the common case is an individual who is also a wallet customer), then
 * agent, then merchant.
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

  return createErrorResponse({ code: "NO_PROFILE_FOUND", message: "No KoriePay profile is associated with this account.", requestId: `KP-REQ-${Date.now()}`, httpStatus: 404 });
}
