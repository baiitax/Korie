import { NextRequest } from 'next/server';
import { authorizeOpsRequest } from '@/lib/security/opsAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/agency/ops/settlements/run
 *
 * Back-office endpoint (AGENCY_OPS_ADMIN / SUPER_ADMIN only) that triggers
 * public.run_daily_settlement() for one org+currency. Since this Supabase
 * project's plan does not have pg_cron enabled (verified at migration time),
 * this on-demand endpoint IS the settlement mechanism — it is expected to be
 * called once per business day (e.g. by an external scheduler hitting this
 * URL, or manually from the ops console). The function itself is idempotent
 * per (org, currency, date), so calling it more than once in a day is safe.
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeOpsRequest(req, ['SUPER_ADMIN', 'AGENCY_OPS_ADMIN']);
  if (!auth.isAuthorized) {
    return createErrorResponse({
      code: auth.errorCode || 'FORBIDDEN',
      message: auth.errorMessage || 'Not authorized.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 403,
    });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // body is optional; defaults below apply
  }

  const orgId = body.org_id;
  const currency = body.currency;

  if (!orgId || !currency) {
    return createErrorResponse({ code: 'MISSING_PARAMETERS', message: 'org_id and currency are required.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc('run_daily_settlement', {
    p_org_id: orgId,
    p_currency: currency,
    p_settlement_date: body.settlement_date || new Date().toISOString().slice(0, 10),
  });

  if (error) {
    return createErrorResponse({ code: 'SETTLEMENT_RUN_FAILED', message: error.message || 'Settlement run failed.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 500 });
  }

  return createSuccessResponse(
    {
      id: data.id,
      batch_reference: data.batch_reference,
      currency: data.currency,
      settlement_date: data.settlement_date,
      status: data.status,
      total_commission_amount: Number(data.total_commission_amount),
      total_agent_count: data.total_agent_count,
      posted_at: data.posted_at,
    },
    { code: 'SETTLEMENT_RUN_COMPLETE', requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' }
  );
}
