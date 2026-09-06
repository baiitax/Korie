import { NextRequest } from 'next/server';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getEffectiveLimits } from '@/lib/agency/limits';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/agency/limits
 *
 * Returns the authenticated agent's real, currently-effective transaction
 * limits plus today's usage against them, computed server-side from
 * agents/agent_limit_overrides/agency_transactions. The frontend renders
 * this directly rather than deriving its own limit math.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  let limits;
  try {
    limits = await getEffectiveLimits(admin, agent.agentId);
  } catch {
    return createErrorResponse({ code: 'LIMITS_LOOKUP_FAILED', message: 'Could not resolve limits.', requestId: agent.requestId, httpStatus: 500 });
  }

  const { data: todayTx, error: txError } = await admin
    .from('agency_transactions')
    .select('amount')
    .eq('agent_id', agent.agentId)
    .in('status', ['SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION'])
    .gte('created_at', new Date().toISOString().slice(0, 10));

  if (txError) {
    return createErrorResponse({ code: 'USAGE_LOOKUP_FAILED', message: 'Could not compute today\'s usage.', requestId: agent.requestId, httpStatus: 500 });
  }

  const todaySpent = (todayTx || []).reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  return createSuccessResponse(
    {
      daily_cash_limit: limits.dailyCashLimit,
      single_transaction_limit: limits.singleTransactionLimit,
      today_spent: todaySpent,
      remaining_today: Math.max(limits.dailyCashLimit - todaySpent, 0),
      transaction_count_today: (todayTx || []).length,
    },
    { code: 'LIMITS_RETRIEVED', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}
