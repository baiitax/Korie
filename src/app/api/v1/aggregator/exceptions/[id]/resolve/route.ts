import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/aggregator/exceptions/:id/resolve — records a real,
 * permanent resolution decision (resolution_notes/resolved_at), scoped to
 * exceptions belonging to the caller's own aggregator.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAggregatorRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const notes = String(body.notes || '').trim();
  if (!notes) {
    return createErrorResponse({ code: 'MISSING_NOTES', message: 'Resolution notes are required.', requestId: staff.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data: existing } = await admin.from('aggregator_exceptions').select('id').eq('id', params.id).eq('aggregator_id', staff.aggregatorId).maybeSingle();
  if (!existing) {
    return createErrorResponse({ code: 'EXCEPTION_NOT_FOUND', message: 'Exception not found.', requestId: staff.requestId, httpStatus: 404 });
  }

  const { data: updated, error } = await admin
    .from('aggregator_exceptions')
    .update({ current_state: 'RESOLVED', resolution_notes: notes, resolved_at: new Date().toISOString(), owner_staff_id: staff.staffId })
    .eq('id', params.id)
    .select()
    .single();

  if (error || !updated) {
    return createErrorResponse({ code: 'RESOLVE_FAILED', message: 'Could not resolve exception.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('aggregator_audit_logs').insert({
    aggregator_id: staff.aggregatorId,
    actor_staff_id: staff.staffId,
    action: 'EXCEPTION_RESOLVED',
    target_type: 'aggregator_exceptions',
    target_id: params.id,
    result: 'SUCCESS',
    reason: notes,
  });

  return createSuccessResponse({ id: updated.id, currentState: updated.current_state }, { code: 'EXCEPTION_RESOLVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
