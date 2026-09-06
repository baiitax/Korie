import { NextRequest } from 'next/server';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

const VALID_METHODS = ['BANK_TRANSFER', 'CASH_DEPOSIT_HUB', 'SUPER_AGENT_ALLOCATION'];

/**
 * GET /api/v1/agency/float-topup
 *
 * The authenticated agent's own real float top-up request history
 * (public.agent_float_topup_requests). Requests start PENDING and only
 * move to APPROVED when a real treasury reviewer calls
 * public.approve_agent_float_topup() — never client-side.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('agent_float_topup_requests')
    .select('*')
    .eq('agent_id', agent.agentId)
    .order('requested_at', { ascending: false })
    .limit(50);

  if (error) {
    return createErrorResponse({ code: 'TOPUP_LOOKUP_FAILED', message: 'Could not load float top-up requests.', requestId: agent.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    {
      requests: (data || []).map((r: any) => ({
        id: r.id,
        amount: Number(r.amount),
        currency: r.currency,
        method: r.method,
        proof_reference: r.proof_reference,
        status: r.status,
        requested_at: r.requested_at,
        reviewed_at: r.reviewed_at,
        notes: r.notes,
      })),
    },
    { code: 'TOPUP_REQUESTS_RETRIEVED', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}

/**
 * POST /api/v1/agency/float-topup
 *
 * Submits a real PENDING float top-up request. Blocks a second request
 * while one is already pending (server-enforced, not just a disabled UI
 * button). No balance changes here — approval is a separate, back-office
 * action.
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

  const amount = Number(body.amount);
  const method = body.method;

  if (!amount || amount <= 0 || !Number.isFinite(amount)) {
    return createErrorResponse({ code: 'INVALID_AMOUNT', message: 'Enter a valid top-up amount.', requestId: agent.requestId, httpStatus: 400 });
  }
  if (!VALID_METHODS.includes(method)) {
    return createErrorResponse({ code: 'INVALID_METHOD', message: 'Select a valid top-up method.', requestId: agent.requestId, httpStatus: 400 });
  }

  const { data: existingPending, error: pendingErr } = await admin
    .from('agent_float_topup_requests')
    .select('id')
    .eq('agent_id', agent.agentId)
    .eq('status', 'PENDING')
    .maybeSingle();

  if (pendingErr) {
    return createErrorResponse({ code: 'TOPUP_CHECK_FAILED', message: 'Could not verify pending requests.', requestId: agent.requestId, httpStatus: 500 });
  }
  if (existingPending) {
    return createErrorResponse({ code: 'TOPUP_ALREADY_PENDING', message: 'You already have a pending float top-up request awaiting review.', requestId: agent.requestId, httpStatus: 409 });
  }

  const { data: floatAccount } = await admin
    .from('agent_float_accounts')
    .select('currency')
    .eq('agent_id', agent.agentId)
    .eq('account_kind', 'WALLET_FLOAT')
    .maybeSingle();

  const currency = floatAccount?.currency || 'NGN';

  const { data, error } = await admin
    .from('agent_float_topup_requests')
    .insert({
      agent_id: agent.agentId,
      amount,
      currency,
      method,
      proof_reference: body.proof_reference || null,
      status: 'PENDING',
    })
    .select()
    .single();

  if (error) {
    return createErrorResponse({ code: 'TOPUP_CREATE_FAILED', message: 'Could not submit float top-up request.', requestId: agent.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    {
      id: data.id,
      amount: Number(data.amount),
      currency: data.currency,
      method: data.method,
      status: data.status,
      requested_at: data.requested_at,
    },
    { code: 'TOPUP_REQUEST_SUBMITTED', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}
