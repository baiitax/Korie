import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET/PUT /api/v1/merchant/settings/sweep — real persistence for the
 * auto-sweep configuration (was a local-state-only toggle with no
 * backing table).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_sweep_settings')
    .select('auto_sweep_enabled, sweep_frequency')
    .eq('merchant_id', staff.merchantId)
    .maybeSingle();

  if (error) {
    return createErrorResponse({ code: 'SWEEP_SETTINGS_LOOKUP_FAILED', message: 'Could not load sweep settings.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    { autoSweepEnabled: data?.auto_sweep_enabled ?? true, sweepFrequency: data?.sweep_frequency ?? 'DAILY_EOD' },
    { code: 'SWEEP_SETTINGS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' },
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

  const sweepFrequency = ['DAILY_EOD', 'INSTANT_PER_TX'].includes(body.sweepFrequency) ? body.sweepFrequency : 'DAILY_EOD';

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_sweep_settings')
    .upsert(
      { merchant_id: staff.merchantId, auto_sweep_enabled: Boolean(body.autoSweepEnabled), sweep_frequency: sweepFrequency, updated_at: new Date().toISOString() },
      { onConflict: 'merchant_id' },
    )
    .select('auto_sweep_enabled, sweep_frequency')
    .single();

  if (error || !data) {
    return createErrorResponse({ code: 'SWEEP_SETTINGS_UPDATE_FAILED', message: 'Could not save sweep settings.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    { autoSweepEnabled: data.auto_sweep_enabled, sweepFrequency: data.sweep_frequency },
    { code: 'SWEEP_SETTINGS_UPDATED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
