import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/devices — real public.aggregator_devices rows for
 * the calling staff member. Also opportunistically upserts a row for the
 * device making this very request (based on User-Agent), the same
 * "log-on-visit" registration pattern used elsewhere, so the first login
 * ever produces a real device record instead of an empty list forever.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const userAgent = req.headers.get('user-agent') || 'Unknown device';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
  const deviceLabel = userAgent.includes('Mobile') ? 'Mobile Browser' : userAgent.includes('Macintosh') ? 'Mac Browser' : userAgent.includes('Windows') ? 'Windows Browser' : 'Browser Session';

  const { data: existingDevice } = await admin
    .from('aggregator_devices')
    .select('id')
    .eq('staff_id', staff.staffId)
    .eq('user_agent', userAgent)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (existingDevice) {
    await admin.from('aggregator_devices').update({ last_active_at: new Date().toISOString(), ip_address: ip, is_current: true }).eq('id', existingDevice.id);
    await admin.from('aggregator_devices').update({ is_current: false }).eq('staff_id', staff.staffId).neq('id', existingDevice.id);
  } else {
    await admin.from('aggregator_devices').update({ is_current: false }).eq('staff_id', staff.staffId);
    await admin.from('aggregator_devices').insert({ staff_id: staff.staffId, device_label: deviceLabel, user_agent: userAgent, ip_address: ip, is_current: true });
  }

  const { data, error } = await admin
    .from('aggregator_devices')
    .select('id, device_label, user_agent, ip_address, first_seen_at, last_active_at, is_current, status')
    .eq('staff_id', staff.staffId)
    .order('last_active_at', { ascending: false });

  if (error) {
    return createErrorResponse({ code: 'DEVICES_LOOKUP_FAILED', message: 'Could not load devices.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((d: any) => ({
    id: d.id,
    deviceLabel: d.device_label,
    ipAddress: d.ip_address || '—',
    firstSeenAt: d.first_seen_at,
    lastActiveAt: d.last_active_at,
    isCurrent: d.is_current,
    status: d.status,
  }));

  return createSuccessResponse({ devices: mapped }, { code: 'DEVICES_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
