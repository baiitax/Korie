import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/notifications — real public.aggregator_notifications
 * rows for this aggregator.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('aggregator_notifications')
    .select('id, category, severity, title, body, is_read, created_at, read_at')
    .eq('aggregator_id', staff.aggregatorId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return createErrorResponse({ code: 'NOTIFICATIONS_LOOKUP_FAILED', message: 'Could not load notifications.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((n: any) => ({
    id: n.id,
    category: n.category,
    severity: n.severity,
    title: n.title,
    body: n.body,
    isRead: n.is_read,
    createdAt: n.created_at,
    readAt: n.read_at,
  }));

  return createSuccessResponse({ notifications: mapped, unreadCount: mapped.filter((m) => !m.isRead).length }, { code: 'NOTIFICATIONS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
