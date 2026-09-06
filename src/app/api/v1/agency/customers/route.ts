import { NextRequest } from 'next/server';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/agency/customers
 *
 * The authenticated agent's own real customer directory
 * (public.agency_customers), automatically populated/refreshed by the
 * trg_upsert_agency_customer trigger on every SUCCESSFUL cash-in/cash-out.
 * Never a static fixture — a brand new agent legitimately sees an empty list
 * until they process their first transaction.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 200);

  const { data, error } = await admin
    .from('agency_customers')
    .select('*')
    .eq('agent_id', agent.agentId)
    .order('last_activity_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return createErrorResponse({ code: 'CUSTOMERS_LOOKUP_FAILED', message: 'Could not load your customer directory.', requestId: agent.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    {
      customers: (data || []).map((c: any) => ({
        id: c.id,
        full_name: c.full_name,
        phone: c.phone,
        account_number_masked: c.account_number_masked,
        bank_name: c.bank_name,
        bank_code: c.bank_code,
        kyc_tier: c.kyc_tier,
        is_verified: c.is_verified,
        total_transactions_count: c.total_transactions_count,
        last_activity_at: c.last_activity_at,
      })),
    },
    { code: 'CUSTOMERS_RETRIEVED', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}

/**
 * POST /api/v1/agency/customers
 *
 * Manual onboarding of a customer the agent has met but not yet transacted
 * with (real INSERT — replaces the old "Onboard New Customer" button that
 * only fired a browser alert()). Does not create a Supabase Auth identity;
 * this is the agent's own retail record, matching the agency_customers
 * design used by the automatic transaction-upsert trigger.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: agent.requestId, httpStatus: 400 });
  }

  const { full_name, phone, account_number_masked, bank_name, bank_code, kyc_tier } = body;
  if (!full_name || !phone) {
    return createErrorResponse({ code: 'MISSING_CUSTOMER_DETAILS', message: 'Customer full name and phone are required.', requestId: agent.requestId, httpStatus: 400 });
  }

  const { data, error } = await admin
    .from('agency_customers')
    .upsert(
      {
        agent_id: agent.agentId,
        full_name,
        phone,
        account_number_masked: account_number_masked || null,
        bank_name: bank_name || null,
        bank_code: bank_code || null,
        kyc_tier: kyc_tier || 'TIER_1',
        is_verified: false,
        last_activity_at: new Date().toISOString(),
      },
      { onConflict: 'agent_id,phone' }
    )
    .select()
    .single();

  if (error) {
    return createErrorResponse({ code: 'CUSTOMER_CREATE_FAILED', message: 'Could not onboard this customer.', requestId: agent.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    { customer: data },
    { code: 'CUSTOMER_ONBOARDED', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}
