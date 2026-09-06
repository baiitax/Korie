import { NextRequest } from 'next/server';
import { authorizeOpsRequest } from '@/lib/security/opsAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/agency/ops/float-topup/:id/decision
 *
 * Human treasury/ops admin approves or rejects an agent's float top-up
 * request.
 *
 * On APPROVE: calls the `approve_agent_float_topup` RPC, which — inside a
 * single DB transaction — books a real double-entry ledger movement
 * (treasury funding account DEBIT, agent wallet-float account CREDIT) and
 * marks the request APPROVED with the resulting ledger_transaction_id. No
 * balance is fabricated in application code; the RPC is the only writer of
 * the ledger and float balances for this action.
 *
 * On REJECT: only the request row is updated (status, reviewer, timestamp,
 * optional note) — no ledger entries are created.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorizeOpsRequest(req, ['SUPER_ADMIN', 'AGENCY_OPS_ADMIN']);
  if (!auth.isAuthorized) {
    return createErrorResponse({
      code: auth.errorCode || 'FORBIDDEN',
      message: auth.errorMessage || 'Not authorized.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 403,
    });
  }

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

  const { decision, notes } = body;
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return createErrorResponse({
      code: 'INVALID_DECISION',
      message: 'decision must be APPROVED or REJECTED.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 400,
    });
  }

  const admin = getSupabaseAdminClient();

  const { data: request, error: fetchError } = await admin
    .from('agent_float_topup_requests')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchError || !request) {
    return createErrorResponse({
      code: 'TOPUP_REQUEST_NOT_FOUND',
      message: 'Float top-up request not found.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 404,
    });
  }

  if (request.status !== 'PENDING') {
    return createErrorResponse({
      code: 'TOPUP_REQUEST_ALREADY_DECIDED',
      message: `This request has already been ${request.status}.`,
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 409,
    });
  }

  if (decision === 'REJECTED') {
    const { data: updated, error: rejectError } = await admin
      .from('agent_float_topup_requests')
      .update({
        status: 'REJECTED',
        reviewed_by: auth.userId,
        reviewed_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (rejectError) {
      return createErrorResponse({
        code: 'TOPUP_REJECT_FAILED',
        message: 'Could not reject the float top-up request.',
        requestId: `KP-REQ-${Date.now()}`,
        httpStatus: 500,
      });
    }

    return createSuccessResponse(
      { id: updated.id, status: updated.status },
      { code: 'FLOAT_TOPUP_REJECTED', requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' }
    );
  }

  // APPROVED path — the RPC performs the real ledger movement and status update.
  const { data: approvedRequest, error: approveError } = await admin.rpc('approve_agent_float_topup', {
    p_request_id: params.id,
    p_reviewer_id: auth.userId,
  });

  if (approveError) {
    const code = approveError.message?.includes('AGENT_FLOAT_NOT_PROVISIONED')
      ? 'AGENT_FLOAT_NOT_PROVISIONED'
      : approveError.message?.includes('TOPUP_REQUEST_ALREADY_DECIDED')
        ? 'TOPUP_REQUEST_ALREADY_DECIDED'
        : 'TOPUP_APPROVE_FAILED';
    return createErrorResponse({
      code,
      message: approveError.message || 'Could not approve the float top-up request.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: code === 'TOPUP_APPROVE_FAILED' ? 500 : 409,
    });
  }

  await admin.from('agent_audit_logs').insert({
    agent_id: request.agent_id,
    action: 'FLOAT_TOPUP_APPROVED',
    target_type: 'agent_float_topup_requests',
    target_id: params.id,
    result: 'SUCCESS',
    reason: `Approved by ops reviewer; amount=${request.amount} ${request.currency}`,
  });

  return createSuccessResponse(
    {
      id: approvedRequest.id,
      status: approvedRequest.status,
      ledger_transaction_id: approvedRequest.ledger_transaction_id,
    },
    { code: 'FLOAT_TOPUP_APPROVED', requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' }
  );
}
