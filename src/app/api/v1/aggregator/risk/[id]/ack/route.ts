import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/aggregator/risk/:id/ack — acknowledges a risk alert
 * (real, permanent status transition), scoped to alerts belonging to the
 * caller's own aggregator.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAggregatorRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: existing } = await admin.from('aggregator_risk_alerts').select('id').eq('id', params.id).eq('aggregator_id', staff.aggregatorId).maybeSingle();
  if (!existing) {
    return createErrorResponse({ code: 'ALERT_NOT_FOUND', message: 'Risk alert not found.', requestId: staff.requestId, httpStatus: 404 });
  }

  const { data: updated, error } = await admin
    .from('aggregator_risk_alerts')
    .update({ status: 'ACKNOWLEDGED', acknowledged_by: staff.staffId, acknowledged_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error || !updated) {
    return createErrorResponse({ code: 'ACK_FAILED', message: 'Could not acknowledge alert.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('aggregator_audit_logs').insert({
    aggregator_id: staff.aggregatorId,
    actor_staff_id: staff.staffId,
    action: 'RISK_ALERT_ACKNOWLEDGED',
    target_type: 'aggregator_risk_alerts',
    target_id: params.id,
    result: 'SUCCESS',
    reason: 'Risk alert acknowledged by staff.',
  });

  return createSuccessResponse({ id: updated.id, status: updated.status }, { code: 'RISK_ALERT_ACKNOWLEDGED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
