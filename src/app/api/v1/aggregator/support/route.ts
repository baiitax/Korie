import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/support — a quick support summary for this
 * aggregator: open ticket count/breakdown, drawn from the shared
 * public.support_tickets table (customer_type = 'AGGREGATOR',
 * customer_id = aggregator's org_id) that already powers the ops support
 * console — no separate aggregator ticketing schema.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: rows, error } = await admin
    .from('support_tickets')
    .select('status, priority')
    .eq('customer_type', 'AGGREGATOR')
    .eq('customer_id', staff.aggregatorId);

  if (error) {
    return createErrorResponse({ code: 'SUPPORT_SUMMARY_FAILED', message: 'Could not load support summary.', requestId: staff.requestId, httpStatus: 500 });
  }

  const open = (rows || []).filter((r: any) => !['RESOLVED', 'CLOSED'].includes(r.status));
  const critical = open.filter((r: any) => r.priority === 'CRITICAL' || r.priority === 'URGENT');

  return createSuccessResponse(
    { totalTickets: (rows || []).length, openTickets: open.length, criticalOrUrgent: critical.length },
    { code: 'SUPPORT_SUMMARY_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
