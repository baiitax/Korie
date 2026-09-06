import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/targets — real public.aggregator_targets rows,
 * each joined with the real live actual value for its metric type (TPV,
 * transaction count, active agents, new merchants, revenue), computed from
 * the same real tables used elsewhere in the portal — never a fabricated
 * "currentActual".
 *
 * POST /api/v1/aggregator/targets — creates a new target.
 */
async function computeActual(admin: any, orgId: string, metricType: string, deadline: string): Promise<number> {
  const { data: agentRows } = await admin.from('agents').select('id').eq('org_id', orgId);
  const agentIds = (agentRows || []).map((a: any) => a.id);
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  if (metricType === 'ACTIVE_AGENTS') {
    const { count } = await admin.from('agents').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'ACTIVE');
    return count || 0;
  }
  if (metricType === 'NEW_MERCHANTS') {
    const { count } = await admin.from('merchant_profiles').select('id', { count: 'exact', head: true }).eq('org_id', orgId).gte('created_at', periodStart.toISOString());
    return count || 0;
  }
  if (agentIds.length === 0) return 0;

  const { data: txRows } = await admin
    .from('agency_transactions')
    .select('amount, agent_commission, status')
    .in('agent_id', agentIds)
    .gte('created_at', periodStart.toISOString());

  const successful = (txRows || []).filter((t: any) => ['SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION'].includes(t.status));

  if (metricType === 'TRANSACTION_COUNT') return successful.length;
  if (metricType === 'REVENUE') return successful.reduce((s: number, t: any) => s + Number(t.agent_commission || 0) * 0.5, 0);
  // TPV
  return successful.reduce((s: number, t: any) => s + Number(t.amount), 0);
}

export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: targets, error } = await admin
    .from('aggregator_targets')
    .select('id, title, metric_type, target_value, unit, period_label, deadline')
    .eq('aggregator_id', staff.aggregatorId)
    .order('deadline', { ascending: true });

  if (error) {
    return createErrorResponse({ code: 'TARGETS_LOOKUP_FAILED', message: 'Could not load targets.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = await Promise.all(
    (targets || []).map(async (t: any) => ({
      id: t.id,
      title: t.title,
      metricType: t.metric_type,
      targetValue: Number(t.target_value),
      currentActual: await computeActual(admin, staff.orgId, t.metric_type, t.deadline),
      unit: t.unit,
      period: t.period_label,
      deadline: t.deadline,
    })),
  );

  return createSuccessResponse({ targets: mapped }, { code: 'TARGETS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req);
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

  const title = String(body.title || '').trim();
  const metricType = ['TPV', 'TRANSACTION_COUNT', 'ACTIVE_AGENTS', 'NEW_MERCHANTS', 'REVENUE'].includes(body.metricType) ? body.metricType : null;
  const targetValue = Number(body.targetValue);
  const deadline = body.deadline;

  if (!title || !metricType || !targetValue || targetValue <= 0 || !deadline) {
    return createErrorResponse({ code: 'MISSING_FIELDS', message: 'Title, metricType, a positive targetValue, and deadline are required.', requestId: staff.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('aggregator_targets')
    .insert({
      aggregator_id: staff.aggregatorId,
      title,
      metric_type: metricType,
      target_value: targetValue,
      unit: body.unit || 'NGN',
      period_label: body.period || 'MONTHLY',
      deadline,
      created_by: staff.staffId,
    })
    .select()
    .single();

  if (error || !data) {
    return createErrorResponse({ code: 'TARGET_CREATE_FAILED', message: 'Could not create target.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse({ id: data.id }, { code: 'TARGET_CREATED', requestId: staff.requestId, environment: 'PRODUCTION', status: 201 });
}
