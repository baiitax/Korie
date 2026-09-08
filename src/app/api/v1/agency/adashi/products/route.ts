import { NextRequest } from "next/server";
import { authenticateAgentRequest } from "@/lib/security/agentAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";

/**
 * GET /api/v1/agency/adashi/products
 *
 * Real, active Adashi product catalog (adashi.products) an agent can create
 * a new circle from — replaces the hardcoded INITIAL_ADASHI_PRODUCTS mock
 * array in src/lib/adashi/AdashiMockData.ts. Fee percentages shown here are
 * exactly what public.post_adashi_payout() will use at disbursement time —
 * no separate hardcoded number anywhere else in the app.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: auth.errorMessage || "Unauthorized",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .schema("adashi")
    .from("products")
    .select("id, product_code, product_name, description, default_currency, country_code, minimum_members, maximum_members, contribution_frequency, contribution_amount, grace_period_hours, max_overdue_days, platform_fee_percent, agent_commission_percent, requires_maker_checker_payout, payout_maker_checker_threshold, status")
    .eq("status", "ACTIVE")
    .order("product_code", { ascending: true });

  if (error) {
    return createErrorResponse({ code: "PRODUCTS_LOOKUP_FAILED", message: "Unable to load Adashi products.", requestId: agent.requestId, httpStatus: 500 });
  }

  const products = (data || []).map((p: any) => ({
    id: p.id,
    productCode: p.product_code,
    productName: p.product_name,
    description: p.description,
    currency: p.default_currency,
    countryCode: p.country_code,
    minMembers: p.minimum_members,
    maxMembers: p.maximum_members,
    cadence: p.contribution_frequency,
    contributionAmount: Number(p.contribution_amount),
    gracePeriodHours: p.grace_period_hours,
    maxOverdueDays: p.max_overdue_days,
    platformFeePercent: Number(p.platform_fee_percent),
    agentCommissionPercent: Number(p.agent_commission_percent),
    requiresMakerCheckerPayout: p.requires_maker_checker_payout,
    payoutMakerCheckerThreshold: Number(p.payout_maker_checker_threshold),
  }));

  return createSuccessResponse({ products }, { requestId: agent.requestId, environment: "PRODUCTION" });
}
