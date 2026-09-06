import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/risk — real public.aggregator_risk_alerts rows for
 * this aggregator, joined with the real agent/merchant name.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('aggregator_risk_alerts')
    .select('id, alert_type, severity, entity_type, agent_id, merchant_id, details, recommended_action, status, detected_at, agents(agent_name, agent_code), merchant_profiles(business_name, merchant_code)')
    .eq('aggregator_id', staff.aggregatorId)
    .order('detected_at', { ascending: false })
    .limit(100);

  if (error) {
    return createErrorResponse({ code: 'RISK_ALERTS_LOOKUP_FAILED', message: 'Could not load risk alerts.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((r: any) => {
    const agent = r.agents;
    const merchant = r.merchant_profiles;
    const entityName = r.entity_type === 'AGENT' ? (agent ? `${agent.agent_name} (${agent.agent_code})` : 'Agent') : merchant ? `${merchant.business_name} (${merchant.merchant_code})` : 'Merchant';
    return {
      id: r.id,
      alertType: r.alert_type,
      severity: r.severity,
      entityType: r.entity_type,
      entityName,
      entityId: r.agent_id || r.merchant_id,
      details: r.details,
      recommendedAction: r.recommended_action || '',
      status: r.status,
      detectedAt: r.detected_at,
    };
  });

  return createSuccessResponse({ riskAlerts: mapped }, { code: 'RISK_ALERTS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
