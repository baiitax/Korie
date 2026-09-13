import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/settings — this staff member's own real
 * notification_preferences row (aggregator_staff_users.notification_preferences).
 *
 * PATCH /api/v1/aggregator/settings — updates the caller's own preferences.
 * Never another staff member's — always scoped to staff.staffId, the
 * authenticated caller's own row.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('aggregator_staff_users')
    .select('notification_preferences')
    .eq('id', staff.staffId)
    .single();

  if (error) {
    return createErrorResponse({ code: 'SETTINGS_LOOKUP_FAILED', message: 'Could not load settings.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    { notificationPreferences: data?.notification_preferences || { lowFloatEmailAlerts: true, lowFloatSmsAlerts: true } },
    { code: 'SETTINGS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: staff.requestId, httpStatus: 400 });
  }

  const lowFloatEmailAlerts = typeof body.lowFloatEmailAlerts === 'boolean' ? body.lowFloatEmailAlerts : true;
  const lowFloatSmsAlerts = typeof body.lowFloatSmsAlerts === 'boolean' ? body.lowFloatSmsAlerts : true;

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('aggregator_staff_users')
    .update({ notification_preferences: { lowFloatEmailAlerts, lowFloatSmsAlerts } })
    .eq('id', staff.staffId)
    .select('notification_preferences')
    .single();

  if (error) {
    return createErrorResponse({ code: 'SETTINGS_UPDATE_FAILED', message: 'Could not update settings.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    { notificationPreferences: data.notification_preferences },
    { code: 'SETTINGS_UPDATED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
