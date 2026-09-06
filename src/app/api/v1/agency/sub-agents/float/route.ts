import { NextRequest } from 'next/server';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/agency/sub-agents/float
 *
 * Allocates or reclaims real float between a SUPER_AGENT's own WALLET_FLOAT
 * ledger account and a sub-agent's WALLET_FLOAT ledger account, atomically,
 * via public.transfer_agent_float(). This replaces the old client-side
 * mutation in AgentContext (allocateFloatToSubAgent/reclaimFloatFromSubAgent)
 * that only edited React state — every call here posts a real, balanced,
 * double-entry ledger transaction and a real agent_float_allocations row.
 *
 * Body: { sub_agent_id, direction: "ALLOCATE" | "RECLAIM", amount, note? }
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;

  if (agent.tier !== 'SUPER_AGENT') {
    return createErrorResponse({ code: 'NOT_A_SUPER_AGENT', message: 'Only Super Agents can allocate or reclaim sub-agent float.', requestId: agent.requestId, httpStatus: 403 });
  }

  const admin = getSupabaseAdminClient();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: agent.requestId, httpStatus: 400 });
  }

  const { sub_agent_id, direction, amount, note } = body;
  const parsedAmount = Number(amount);

  if (!sub_agent_id) {
    return createErrorResponse({ code: 'MISSING_SUB_AGENT', message: 'sub_agent_id is required.', requestId: agent.requestId, httpStatus: 400 });
  }
  if (!['ALLOCATE', 'RECLAIM'].includes(direction)) {
    return createErrorResponse({ code: 'INVALID_DIRECTION', message: 'direction must be ALLOCATE or RECLAIM.', requestId: agent.requestId, httpStatus: 400 });
  }
  if (!parsedAmount || parsedAmount <= 0 || !Number.isFinite(parsedAmount)) {
    return createErrorResponse({ code: 'INVALID_AMOUNT', message: 'Enter a valid amount.', requestId: agent.requestId, httpStatus: 400 });
  }

  const { data, error } = await admin.rpc('transfer_agent_float', {
    p_super_agent_id: agent.agentId,
    p_sub_agent_id: sub_agent_id,
    p_direction: direction,
    p_amount: parsedAmount,
    p_note: note || null,
  });

  if (error) {
    const message = error.message || '';
    const map: Record<string, { message: string; status: number }> = {
      NOT_YOUR_SUB_AGENT: { message: 'This agent is not part of your downline.', status: 403 },
      SUB_AGENT_NOT_FOUND: { message: 'Sub-agent not found.', status: 404 },
      INSUFFICIENT_SUPER_AGENT_FLOAT: { message: 'Insufficient wallet float to allocate.', status: 422 },
      INSUFFICIENT_SUB_AGENT_FLOAT: { message: 'Sub-agent does not have enough float to reclaim that amount.', status: 422 },
      AGENT_FLOAT_NOT_PROVISIONED: { message: 'One of these agents has not been provisioned with a float account yet.', status: 409 },
      NOT_A_SUPER_AGENT: { message: 'Only Super Agents can move sub-agent float.', status: 403 },
    };
    const known = Object.keys(map).find((code) => message.includes(code));
    if (known) {
      return createErrorResponse({ code: known, message: map[known].message, requestId: agent.requestId, httpStatus: map[known].status });
    }
    return createErrorResponse({ code: 'FLOAT_TRANSFER_FAILED', message: 'Could not complete this float transfer. Please try again.', requestId: agent.requestId, httpStatus: 500 });
  }

  const record = data;

  return createSuccessResponse(
    {
      id: record.id,
      sub_agent_id: record.sub_agent_id,
      direction: record.direction,
      amount: Number(record.amount),
      currency: record.currency,
      note: record.note,
      timestamp: record.created_at,
    },
    { code: 'FLOAT_TRANSFER_COMPLETED', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}
