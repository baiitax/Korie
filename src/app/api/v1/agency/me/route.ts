import { NextRequest } from 'next/server';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/agency/me
 *
 * Returns the authenticated agent's own real profile — the single source of
 * truth the frontend uses to replace any mock/demo agent identity fields.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('agents')
    .select('id, agent_code, agent_name, business_name, phone, email, country, state_or_region, city_or_lga, tier, status, kyc_status, terminal_id, daily_cash_limit, single_transaction_limit')
    .eq('id', agent.agentId)
    .single();

  if (error || !data) {
    return createErrorResponse({ code: 'AGENT_PROFILE_LOOKUP_FAILED', message: 'Could not load agent profile.', requestId: agent.requestId, httpStatus: 500 });
  }

  const { data: commissionRows } = await admin
    .from('agent_commissions')
    .select('amount')
    .eq('agent_id', agent.agentId)
    .eq('status', 'EARNED');

  const commissionBalance = (commissionRows || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

  const { data: todayTx } = await admin
    .from('agency_transactions')
    .select('amount')
    .eq('agent_id', agent.agentId)
    .in('status', ['SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION'])
    .gte('created_at', new Date().toISOString().slice(0, 10));

  const dailyCashSpent = (todayTx || []).reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  return createSuccessResponse(
    {
      id: data.id,
      agent_code: data.agent_code,
      agent_name: data.agent_name,
      business_name: data.business_name,
      phone: data.phone,
      email: data.email,
      country: data.country,
      state_or_region: data.state_or_region,
      city_or_lga: data.city_or_lga,
      tier: data.tier,
      status: data.status,
      kyc_status: data.kyc_status,
      terminal_id: data.terminal_id,
      daily_cash_limit: Number(data.daily_cash_limit),
      single_transaction_limit: Number(data.single_transaction_limit),
      commission_balance: commissionBalance,
      daily_cash_spent: dailyCashSpent,
    },
    { code: 'AGENT_PROFILE_RETRIEVED', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}
