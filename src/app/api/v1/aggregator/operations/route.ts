import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/operations — a single combined snapshot for the
 * Live Operations Center page: recent failed transactions, open
 * exceptions, and open risk alerts, all from the same real tables as
 * /transactions, /exceptions, and /risk (kept as one call to save the
 * client three round trips on a page that polls frequently).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: agentRows } = await admin.from('agents').select('id, agent_name, agent_code').eq('org_id', staff.orgId);
  const agentIds = (agentRows || []).map((a: any) => a.id);
  const agentById: Record<string, any> = {};
  for (const a of agentRows || []) agentById[(a as any).id] = a;

  let failedTransactions: any[] = [];
  if (agentIds.length > 0) {
    const { data } = await admin
      .from('agency_transactions')
      .select('id, reference, transaction_type, amount, currency, status, failure_reason, agent_id, created_at')
      .in('agent_id', agentIds)
      .eq('status', 'FAILED')
      .order('created_at', { ascending: false })
      .limit(50);
    failedTransactions = (data || []).map((t: any) => ({
      id: t.id,
      reference: t.reference,
      type: t.transaction_type,
      amount: Number(t.amount),
      currency: t.currency,
      failureReason: t.failure_reason || 'Unspecified provider error',
      agentName: agentById[t.agent_id] ? `${agentById[t.agent_id].agent_name} (${agentById[t.agent_id].agent_code})` : 'Agent',
      createdAt: t.created_at,
    }));
  }

  const [{ data: exceptions }, { data: riskAlerts }] = await Promise.all([
    admin.from('aggregator_exceptions').select('id, reference, category, severity, affected_entity, current_state, detected_at').eq('aggregator_id', staff.aggregatorId).neq('current_state', 'RESOLVED').order('detected_at', { ascending: false }).limit(50),
    admin.from('aggregator_risk_alerts').select('id, alert_type, severity, entity_type, details, status, detected_at').eq('aggregator_id', staff.aggregatorId).eq('status', 'OPEN').order('detected_at', { ascending: false }).limit(50),
  ]);

  // Mapped to the same camelCase DTO shape the /exceptions and /risk
  // endpoints already return, so the Operations Center page can render
  // these without special-casing raw DB column names.
  const mappedExceptions = (exceptions || []).map((e: any) => ({
    id: e.id,
    reference: e.reference,
    category: e.category,
    severity: e.severity,
    affectedEntity: e.affected_entity,
    currentState: e.current_state,
    detectedAt: e.detected_at,
  }));

  const mappedRiskAlerts = (riskAlerts || []).map((r: any) => ({
    id: r.id,
    alertType: r.alert_type,
    severity: r.severity,
    entityType: r.entity_type,
    details: r.details,
    status: r.status,
    detectedAt: r.detected_at,
  }));

  return createSuccessResponse(
    { failedTransactions, openExceptions: mappedExceptions, openRiskAlerts: mappedRiskAlerts },
    { code: 'OPERATIONS_SNAPSHOT_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
