import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * DELETE /api/v1/aggregator/keys/:id — revokes an API key (real, permanent
 * status transition to REVOKED; keys are never hard-deleted for audit
 * purposes).
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: existing } = await admin.from('aggregator_api_keys').select('id').eq('id', params.id).eq('aggregator_id', staff.aggregatorId).maybeSingle();
  if (!existing) {
    return createErrorResponse({ code: 'KEY_NOT_FOUND', message: 'API key not found.', requestId: staff.requestId, httpStatus: 404 });
  }

  const { error } = await admin.from('aggregator_api_keys').update({ status: 'REVOKED' }).eq('id', params.id);
  if (error) {
    return createErrorResponse({ code: 'KEY_REVOKE_FAILED', message: 'Could not revoke key.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('aggregator_audit_logs').insert({
    aggregator_id: staff.aggregatorId,
    actor_staff_id: staff.staffId,
    action: 'API_KEY_REVOKED',
    target_type: 'aggregator_api_keys',
    target_id: params.id,
    result: 'SUCCESS',
    reason: 'API key revoked by staff.',
  });

  return createSuccessResponse({ id: params.id, status: 'REVOKED' }, { code: 'KEY_REVOKED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
