import { NextRequest } from 'next/server';
import { authorizeOpsRequest } from '@/lib/security/opsAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

const VALID_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'RESTRICTED', 'DEACTIVATED'];

/**
 * POST /api/v1/agency/ops/agents/:id/status
 *
 * Real status transition for any `agents` row — the activation step for
 * self-registered agents (see /api/auth/agent/register, which creates them
 * as PENDING) as well as ordinary suspend/reinstate actions on already
 * -active agents. This is the one real write path behind the Admin
 * Portal's Agents screen; nothing here fabricates approval — it is gated by
 * a real Supabase session with an AGENCY_OPS_ADMIN/SUPER_ADMIN role.
 *
 * Distinct from /api/v1/agency/ops/onboarding/:id/decision, which handles
 * applications that have not yet created a login — this endpoint acts on an
 * `agents` row that already exists (self-registered or already onboarded).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorizeOpsRequest(req, ['SUPER_ADMIN', 'AGENCY_OPS_ADMIN']);
  if (!auth.isAuthorized) {
    return createErrorResponse({ code: auth.errorCode || 'FORBIDDEN', message: auth.errorMessage || 'Not authorized.', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const { newStatus, reason } = body;
  if (!VALID_STATUSES.includes(newStatus)) {
    return createErrorResponse({ code: 'INVALID_STATUS', message: `newStatus must be one of ${VALID_STATUSES.join(', ')}.`, requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data: agentRow, error: fetchError } = await admin
    .from('agents')
    .select('id, agent_code, status')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchError || !agentRow) {
    return createErrorResponse({ code: 'AGENT_NOT_FOUND', message: 'Agent not found.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 404 });
  }

  const previousStatus = agentRow.status;

  const { data: updated, error: updateError } = await admin
    .from('agents')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id, agent_code, status')
    .single();

  if (updateError || !updated) {
    return createErrorResponse({ code: 'STATUS_UPDATE_FAILED', message: 'Could not update agent status.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 500 });
  }

  await admin.from('agent_audit_logs').insert({
    agent_id: params.id,
    action: 'AGENT_STATUS_CHANGED',
    target_type: 'agents',
    target_id: params.id,
    result: 'SUCCESS',
    reason: reason || `Status changed ${previousStatus} -> ${newStatus} by ops reviewer.`,
  });

  return createSuccessResponse(
    { id: updated.id, agent_code: updated.agent_code, previous_status: previousStatus, status: updated.status },
    { code: 'AGENT_STATUS_UPDATED', message: `Agent status changed to ${updated.status}.`, requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
