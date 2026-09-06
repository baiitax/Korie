import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET/PUT /api/v1/merchant/settings/notifications — real persistence for
 * the notification/2FA toggles. Replaces local-state-only switches that
 * reset on every page reload and a "Save Changes" button that never
 * called an API.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_notification_settings')
    .select('email_alerts, sms_alerts, two_factor_auth')
    .eq('merchant_id', staff.merchantId)
    .maybeSingle();

  if (error) {
    return createErrorResponse({ code: 'SETTINGS_LOOKUP_FAILED', message: 'Could not load settings.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    {
      emailAlerts: data?.email_alerts ?? true,
      smsAlerts: data?.sms_alerts ?? true,
      twoFactorAuth: data?.two_factor_auth ?? false,
    },
    { code: 'SETTINGS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}

export async function PUT(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req);
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

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_notification_settings')
    .upsert(
      {
        merchant_id: staff.merchantId,
        email_alerts: Boolean(body.emailAlerts),
        sms_alerts: Boolean(body.smsAlerts),
        two_factor_auth: Boolean(body.twoFactorAuth),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'merchant_id' },
    )
    .select('email_alerts, sms_alerts, two_factor_auth')
    .single();

  if (error || !data) {
    return createErrorResponse({ code: 'SETTINGS_UPDATE_FAILED', message: 'Could not save settings.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('merchant_audit_logs').insert({
    merchant_id: staff.merchantId,
    actor_staff_id: staff.staffId,
    action: 'NOTIFICATION_SETTINGS_UPDATED',
    target_type: 'merchant_notification_settings',
    target_id: staff.merchantId,
    result: 'SUCCESS',
  });

  return createSuccessResponse(
    { emailAlerts: data.email_alerts, smsAlerts: data.sms_alerts, twoFactorAuth: data.two_factor_auth },
    { code: 'SETTINGS_UPDATED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
