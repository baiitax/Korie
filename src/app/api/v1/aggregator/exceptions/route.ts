import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/exceptions — real public.aggregator_exceptions
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
    .from('aggregator_exceptions')
    .select('id, reference, category, severity, affected_entity, current_state, description, recommended_action, resolution_notes, detected_at, resolved_at, aggregator_staff_users(full_name)')
    .eq('aggregator_id', staff.aggregatorId)
    .order('detected_at', { ascending: false })
    .limit(100);

  if (error) {
    return createErrorResponse({ code: 'EXCEPTIONS_LOOKUP_FAILED', message: 'Could not load exceptions.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((e: any) => ({
    id: e.id,
    reference: e.reference,
    category: e.category,
    severity: e.severity,
    affectedEntity: e.affected_entity,
    detectedAt: e.detected_at,
    currentState: e.current_state,
    owner: e.aggregator_staff_users?.full_name || 'Unassigned',
    description: e.description,
    recommendedAction: e.recommended_action || '',
  }));

  return createSuccessResponse({ exceptions: mapped }, { code: 'EXCEPTIONS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
