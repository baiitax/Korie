import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export const dynamic = 'force-dynamic';

/**
 * POST /api/regional/float/review
 *
 * A Regional Manager decides a PENDING agent float top-up request.
 *
 *  • APPROVE → the `approve_agent_float_topup` RPC is the ONLY writer: it
 *    books the real double-entry movement (treasury DEBIT, agent float
 *    CREDIT) inside one transaction and stamps the ledger_transaction_id.
 *  • REJECT  → only the request row changes (status, reviewer, note).
 *
 * Territory check first: the manager may only decide requests for agents
 * whose state_or_region is inside their own territory. The decision is
 * audit-logged in audit_events with the manager's verified identity.
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.liquidity.view');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({
      code: 'INVALID_JSON',
      message: 'Invalid JSON body.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 400,
    });
  }

  const { requestId, decision, notes } = body ?? {};
  if (!requestId || !['APPROVED', 'REJECTED'].includes(decision)) {
    return createErrorResponse({
      code: 'INVALID_DECISION',
      message: 'requestId and decision (APPROVED | REJECTED) are required.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 400,
    });
  }

  const admin = getSupabaseAdminClient();

  const { data: request, error: fetchError } = await admin
    .from('agent_float_topup_requests')
    .select('id, agent_id, amount, currency, status')
    .eq('id', requestId)
    .maybeSingle();
  if (fetchError || !request) {
    return createErrorResponse({
      code: 'TOPUP_REQUEST_NOT_FOUND',
      message: 'Float top-up request not found.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 404,
    });
  }
  // Dual control (migration 20260914000051): PENDING_SECOND_APPROVAL requests
  // remain decidable — a second, DIFFERENT reviewer completes the approval.
  if (!['PENDING', 'PENDING_SECOND_APPROVAL'].includes(request.status)) {
    return createErrorResponse({
      code: 'TOPUP_REQUEST_ALREADY_DECIDED',
      message: `This request has already been ${request.status}.`,
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 409,
    });
  }

  /* Territory scope: the agent must sit inside this manager's region. */
  const { data: agent } = await admin
    .from('agents')
    .select('id, agent_code, agent_name, state_or_region, country')
    .eq('id', request.agent_id)
    .maybeSingle();
  if (!agent || agent.country !== manager.country || !manager.territories.includes(agent.state_or_region)) {
    return createErrorResponse({
      code: 'OUTSIDE_TERRITORY',
      message: 'This agent is outside your territory, so the decision is not yours to make.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 403,
    });
  }

  if (decision === 'APPROVED') {
    const { data: approved, error: approveError } = await admin.rpc('approve_agent_float_topup', {
      p_request_id: request.id,
      p_reviewer_id: manager.authUserId,
    });
    if (approveError || !approved) {
      return createErrorResponse({
        code: 'TOPUP_APPROVE_FAILED',
        message: approveError?.message ?? 'The ledger did not accept the approval.',
        requestId: `KP-REQ-${Date.now()}`,
        httpStatus: 422,
      });
    }
    if (notes) {
      await admin.from('agent_float_topup_requests').update({ notes: String(notes).slice(0, 500) }).eq('id', request.id);
    }
    await admin.from('audit_events').insert({
      actor_id: manager.managerId,
      actor_email: manager.email,
      actor_role: 'REGIONAL_MANAGER',
      action: 'AGENT_FLOAT_TOPUP_APPROVED',
      resource_type: 'regional:float-topup',
      resource_id: request.id,
      details: {
        agentId: agent.id,
        agentCode: agent.agent_code,
        amount: Number(request.amount),
        currency: request.currency,
        stateOrRegion: agent.state_or_region,
        notes: notes ?? null,
      },
      before_state: { status: request.status },
      after_state: { status: approved.status },
      ip_address: req.headers.get('x-forwarded-for') ?? 'unrecorded',
      request_id: `KP-REQ-${Date.now()}`,
      correlation_id: `KP-REQ-${Date.now()}`,
    });
    return createSuccessResponse(
      { decision: 'APPROVED', requestId: request.id },
      { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
    );
  }

  /* REJECTED: request row only — no ledger movement, ever. */
  const { error: rejectError } = await admin
    .from('agent_float_topup_requests')
    .update({
      status: 'REJECTED',
      reviewed_by: manager.authUserId,
      reviewed_at: new Date().toISOString(),
      notes: notes ? String(notes).slice(0, 500) : null,
    })
    .eq('id', request.id);
  if (rejectError) {
    return createErrorResponse({
      code: 'TOPUP_REJECT_FAILED',
      message: rejectError.message,
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 500,
    });
  }

  await admin.from('audit_events').insert({
    actor_id: manager.managerId,
    actor_email: manager.email,
    actor_role: 'REGIONAL_MANAGER',
    action: 'AGENT_FLOAT_TOPUP_REJECTED',
    resource_type: 'regional:float-topup',
    resource_id: request.id,
    details: {
      agentId: agent.id,
      agentCode: agent.agent_code,
      amount: Number(request.amount),
      currency: request.currency,
      stateOrRegion: agent.state_or_region,
      notes: notes ?? null,
    },
    before_state: { status: 'PENDING' },
    after_state: { status: 'REJECTED' },
    ip_address: req.headers.get('x-forwarded-for') ?? 'unrecorded',
    request_id: `KP-REQ-${Date.now()}`,
    correlation_id: `KP-REQ-${Date.now()}`,
  });

  return createSuccessResponse(
    { decision: 'REJECTED', requestId: request.id },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
