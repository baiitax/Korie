import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/aggregator/liquidity/dispatch
 *
 * Real float dispatch from the aggregator's own main float ledger account
 * to a supervised agent's WALLET_FLOAT ledger account, via the
 * aggregator_dispatch_float() RPC (double-entry, balance-checked,
 * transactional — mirrors transfer_agent_float()). Requires an ACTIVE
 * aggregator organization.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: staff.requestId, httpStatus: 400 });
  }

  const agentId = body.agentId;
  const amount = Number(body.amount);
  const note = body.note ? String(body.note) : null;

  if (!agentId || !amount || amount <= 0) {
    return createErrorResponse({ code: 'INVALID_REQUEST', message: 'agentId and a positive amount are required.', requestId: staff.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data: ledgerTx, error } = await admin.rpc('aggregator_dispatch_float', {
    p_aggregator_id: staff.aggregatorId,
    p_agent_id: agentId,
    p_amount: amount,
    p_note: note,
  });

  if (error) {
    const code = error.message || '';
    if (code.includes('INSUFFICIENT_AGGREGATOR_FLOAT')) {
      return createErrorResponse({ code: 'INSUFFICIENT_AGGREGATOR_FLOAT', message: 'Insufficient aggregator wallet liquidity available.', requestId: staff.requestId, httpStatus: 422 });
    }
    if (code.includes('AGENT_NOT_IN_AGGREGATOR_NETWORK')) {
      return createErrorResponse({ code: 'AGENT_NOT_IN_NETWORK', message: 'That agent is not part of your aggregator network.', requestId: staff.requestId, httpStatus: 403 });
    }
    if (code.includes('AGENT_FLOAT_NOT_PROVISIONED') || code.includes('AGGREGATOR_FLOAT_NOT_PROVISIONED')) {
      return createErrorResponse({ code: 'FLOAT_NOT_PROVISIONED', message: 'Float accounts are not fully provisioned yet.', requestId: staff.requestId, httpStatus: 422 });
    }
    return createErrorResponse({ code: 'DISPATCH_FAILED', message: 'Could not dispatch float.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('aggregator_audit_logs').insert({
    aggregator_id: staff.aggregatorId,
    actor_staff_id: staff.staffId,
    action: 'FLOAT_DISPATCH',
    target_type: 'agents',
    target_id: agentId,
    result: 'SUCCESS',
    reason: note || `Float dispatch of ${amount} to agent.`,
  });

  return createSuccessResponse(
    { reference: ledgerTx.transaction_reference, amount, agentId },
    { code: 'FLOAT_DISPATCHED', message: 'Float dispatched successfully.', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
