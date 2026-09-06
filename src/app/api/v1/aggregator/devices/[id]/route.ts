import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * DELETE /api/v1/aggregator/devices/:id — revokes a device/session (real,
 * permanent status transition; cannot revoke the device making the request).
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: device } = await admin.from('aggregator_devices').select('id, is_current').eq('id', params.id).eq('staff_id', staff.staffId).maybeSingle();
  if (!device) {
    return createErrorResponse({ code: 'DEVICE_NOT_FOUND', message: 'Device not found.', requestId: staff.requestId, httpStatus: 404 });
  }
  if (device.is_current) {
    return createErrorResponse({ code: 'CANNOT_REVOKE_CURRENT_DEVICE', message: 'You cannot revoke the device you are currently signed in on.', requestId: staff.requestId, httpStatus: 400 });
  }

  const { error } = await admin.from('aggregator_devices').update({ status: 'REVOKED' }).eq('id', params.id);
  if (error) {
    return createErrorResponse({ code: 'DEVICE_REVOKE_FAILED', message: 'Could not revoke device.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('aggregator_audit_logs').insert({
    aggregator_id: staff.aggregatorId,
    actor_staff_id: staff.staffId,
    action: 'DEVICE_REVOKED',
    target_type: 'aggregator_devices',
    target_id: params.id,
    result: 'SUCCESS',
    reason: 'Device session revoked by staff.',
  });

  return createSuccessResponse({ id: params.id, status: 'REVOKED' }, { code: 'DEVICE_REVOKED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
