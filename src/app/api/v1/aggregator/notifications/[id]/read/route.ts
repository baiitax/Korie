import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/aggregator/notifications/:id/read — marks a notification as
 * read (real, permanent update).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: existing } = await admin.from('aggregator_notifications').select('id').eq('id', params.id).eq('aggregator_id', staff.aggregatorId).maybeSingle();
  if (!existing) {
    return createErrorResponse({ code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found.', requestId: staff.requestId, httpStatus: 404 });
  }

  const { error } = await admin.from('aggregator_notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', params.id);
  if (error) {
    return createErrorResponse({ code: 'MARK_READ_FAILED', message: 'Could not mark notification as read.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse({ id: params.id, isRead: true }, { code: 'NOTIFICATION_READ', requestId: staff.requestId, environment: 'PRODUCTION' });
}
