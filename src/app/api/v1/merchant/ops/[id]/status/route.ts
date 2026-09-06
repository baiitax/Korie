import { NextRequest } from 'next/server';
import { authorizeOpsRequest } from '@/lib/security/opsAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

const VALID_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'RESTRICTED', 'DEACTIVATED'];

/**
 * POST /api/v1/merchant/ops/:id/status
 *
 * Real status transition for a `merchant_profiles` row — the activation
 * step for self-registered merchants (see /api/auth/merchant/register,
 * which creates them as PENDING). Gated by a real Supabase session with an
 * AGENCY_OPS_ADMIN/SUPER_ADMIN role, mirroring
 * /api/v1/agency/ops/agents/:id/status exactly.
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

  const { data: merchantRow, error: fetchError } = await admin
    .from('merchant_profiles')
    .select('id, merchant_code, status')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchError || !merchantRow) {
    return createErrorResponse({ code: 'MERCHANT_NOT_FOUND', message: 'Merchant not found.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 404 });
  }

  const previousStatus = merchantRow.status;

  const { data: updated, error: updateError } = await admin
    .from('merchant_profiles')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id, merchant_code, status')
    .single();

  if (updateError || !updated) {
    return createErrorResponse({ code: 'STATUS_UPDATE_FAILED', message: 'Could not update merchant status.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 500 });
  }

  await admin.from('merchant_audit_logs').insert({
    merchant_id: params.id,
    action: 'MERCHANT_STATUS_CHANGED',
    target_type: 'merchant_profiles',
    target_id: params.id,
    result: 'SUCCESS',
    reason: reason || `Status changed ${previousStatus} -> ${newStatus} by ops reviewer.`,
  });

  return createSuccessResponse(
    { id: updated.id, merchant_code: updated.merchant_code, previous_status: previousStatus, status: updated.status },
    { code: 'MERCHANT_STATUS_UPDATED', message: `Merchant status changed to ${updated.status}.`, requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
