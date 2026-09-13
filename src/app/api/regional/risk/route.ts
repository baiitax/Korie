import { NextRequest } from 'next/server';
import { authenticateRegionalManagerRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/risk
 *
 * Open risk alerts and unresolved exceptions for the aggregators operating
 * inside the manager's territory. Read-only supervision: acknowledgements
 * and dispositions stay with the aggregator's own risk desk.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateRegionalManagerRequest(req);
  if (!auth.isAuthenticated || !auth.manager) {
    return createErrorResponse({
      code: auth.errorCode || 'UNAUTHORIZED',
      message: auth.errorMessage || 'Not authorized.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }
  const { country, territories } = auth.manager;
  const admin = getSupabaseAdminClient();

  const { data: territoryRows } = await admin
    .from('aggregator_territories')
    .select('id, state_or_region, aggregators(id, aggregator_code, business_name)')
    .eq('country', country)
    .in('state_or_region', territories);

  const aggregatorIds: string[] = [];
  const aggregatorMeta = new Map<string, { code: string; name: string }>();
  (territoryRows ?? []).forEach((t: any) => {
    const agg = Array.isArray(t.aggregators) ? t.aggregators[0] : t.aggregators;
    if (agg?.id) {
      aggregatorIds.push(agg.id);
      aggregatorMeta.set(agg.id, { code: agg.aggregator_code, name: agg.business_name });
    }
  });

  const alerts: any[] = [];
  const exceptions: any[] = [];

  if (aggregatorIds.length > 0) {
    const { data: alertRows } = await admin
      .from('aggregator_risk_alerts')
      .select('id, alert_type, severity, entity_type, agent_id, merchant_id, details, recommended_action, status, detected_at')
      .in('aggregator_id', aggregatorIds)
      .order('detected_at', { ascending: false })
      .limit(100);
    (alertRows ?? []).forEach((a: any) => {
      const agg = aggregatorMeta.get((a as any).aggregator_id) ?? { code: '—', name: '—' };
      alerts.push({ ...a, aggregator: agg });
    });

    const { data: exceptionRows } = await admin
      .from('aggregator_exceptions')
      .select('id, reference, category, severity, affected_entity, current_state, description, recommended_action, resolution_notes, detected_at, resolved_at')
      .in('aggregator_id', aggregatorIds)
      .order('detected_at', { ascending: false })
      .limit(100);
    (exceptionRows ?? []).forEach((e: any) => {
      exceptions.push({ ...e });
    });
  }

  return createSuccessResponse(
    { alerts, exceptions, country, territories },
    { requestId: auth.manager.requestId, environment: 'PRODUCTION' },
  );
}
