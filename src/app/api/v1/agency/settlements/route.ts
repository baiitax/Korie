import { NextRequest } from 'next/server';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/agency/settlements
 *
 * Returns the authenticated agent's own settlement batch lines — i.e. which
 * daily commission settlement batches they were included in, how much, and
 * whether it has been marked PAID by a treasury operator. This is a read of
 * public.settlement_batch_lines, which is only ever written by
 * public.run_daily_settlement() — never fabricated in application code.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({
      code: auth.errorCode || 'UNAUTHORIZED',
      message: auth.errorMessage || 'Unauthorized',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('settlement_batch_lines')
    .select('id, commission_amount, commission_count, status, created_at, settlement_batches(batch_reference, currency, settlement_date, status)')
    .eq('agent_id', agent.agentId)
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) {
    return createErrorResponse({ code: 'SETTLEMENTS_LOOKUP_FAILED', message: 'Could not load settlement history.', requestId: agent.requestId, httpStatus: 500 });
  }

  const { data: pendingCommissions, error: pendingError } = await admin
    .from('agent_commissions')
    .select('amount, currency')
    .eq('agent_id', agent.agentId)
    .eq('status', 'EARNED');

  if (pendingError) {
    return createErrorResponse({ code: 'PENDING_COMMISSION_LOOKUP_FAILED', message: 'Could not load pending commission total.', requestId: agent.requestId, httpStatus: 500 });
  }

  const pendingByCurrency: Record<string, number> = {};
  for (const row of pendingCommissions || []) {
    pendingByCurrency[row.currency] = (pendingByCurrency[row.currency] || 0) + Number(row.amount);
  }

  return createSuccessResponse(
    {
      batches: (data || []).map((line: any) => ({
        id: line.id,
        batch_reference: line.settlement_batches?.batch_reference,
        currency: line.settlement_batches?.currency,
        settlement_date: line.settlement_batches?.settlement_date,
        batch_status: line.settlement_batches?.status,
        commission_amount: Number(line.commission_amount),
        commission_count: line.commission_count,
        line_status: line.status,
        created_at: line.created_at,
      })),
      pending_unbatched_commission: pendingByCurrency,
    },
    { code: 'SETTLEMENTS_RETRIEVED', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}
