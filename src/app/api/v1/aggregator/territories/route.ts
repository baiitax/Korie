import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/territories — real public.aggregator_territories
 * rows for this aggregator, joined with live agent/merchant counts and
 * today's real transaction volume for each territory.
 *
 * POST /api/v1/aggregator/territories — create a new territory (branch
 * hub) to assign agents/merchants to.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: territories, error } = await admin
    .from('aggregator_territories')
    .select('id, name, code, country, state_or_region, lga_or_commune, supervisor_name, hub_address, hub_phone, created_at')
    .eq('aggregator_id', staff.aggregatorId)
    .order('created_at', { ascending: true });

  if (error) {
    return createErrorResponse({ code: 'TERRITORIES_LOOKUP_FAILED', message: 'Could not load territories.', requestId: staff.requestId, httpStatus: 500 });
  }

  const territoryIds = (territories || []).map((t: any) => t.id);
  let agentCounts: Record<string, number> = {};
  let merchantCounts: Record<string, number> = {};
  let tpvByTerritory: Record<string, number> = {};
  let monthlyTpvByTerritory: Record<string, number> = {};
  let commissionByTerritory: Record<string, number> = {};
  let underThresholdByTerritory: Record<string, number> = {};
  let requiringFloatByTerritory: Record<string, number> = {};
  let openHighSeverityRiskByTerritory: Record<string, number> = {};

  if (territoryIds.length > 0) {
    const { data: agentRows } = await admin.from('agents').select('id, aggregator_territory_id').eq('org_id', staff.orgId).eq('status', 'ACTIVE');
    const agentToTerritory: Record<string, string> = {};
    for (const a of agentRows || []) {
      const tid = (a as any).aggregator_territory_id;
      if (tid) {
        agentCounts[tid] = (agentCounts[tid] || 0) + 1;
        agentToTerritory[(a as any).id] = tid;
      }
    }

    const { data: merchantRows } = await admin.from('merchant_profiles').select('id, aggregator_territory_id').eq('org_id', staff.orgId).eq('status', 'ACTIVE');
    const merchantToTerritory: Record<string, string> = {};
    for (const m of merchantRows || []) {
      const tid = (m as any).aggregator_territory_id;
      if (tid) {
        merchantCounts[tid] = (merchantCounts[tid] || 0) + 1;
        merchantToTerritory[(m as any).id] = tid;
      }
    }

    const agentIds = Object.keys(agentToTerritory);

    if (agentIds.length > 0) {
      const now = new Date();
      const todayStart = now.toISOString().slice(0, 10);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [{ data: todayTx }, { data: monthTx }] = await Promise.all([
        admin
          .from('agency_transactions')
          .select('agent_id, amount, agent_commission, status')
          .in('agent_id', agentIds)
          .gte('created_at', todayStart),
        admin
          .from('agency_transactions')
          .select('agent_id, amount, status')
          .in('agent_id', agentIds)
          .gte('created_at', monthStart),
      ]);

      for (const t of todayTx || []) {
        if (!['SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION'].includes((t as any).status)) continue;
        const tid = agentToTerritory[(t as any).agent_id];
        if (!tid) continue;
        tpvByTerritory[tid] = (tpvByTerritory[tid] || 0) + Number((t as any).amount);
        commissionByTerritory[tid] = (commissionByTerritory[tid] || 0) + Number((t as any).agent_commission || 0) * 0.5;
      }

      for (const t of monthTx || []) {
        if (!['SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION'].includes((t as any).status)) continue;
        const tid = agentToTerritory[(t as any).agent_id];
        if (!tid) continue;
        monthlyTpvByTerritory[tid] = (monthlyTpvByTerritory[tid] || 0) + Number((t as any).amount);
      }

      // Real per-territory liquidity health: agents under their own
      // cash_threshold_min / with zero float, rolled up by territory —
      // the same signal /liquidity already computes network-wide.
      const { data: floatRows } = await admin
        .from('agent_float_accounts')
        .select('agent_id, account_kind, cash_threshold_min, ledger_accounts(balance)')
        .in('agent_id', agentIds)
        .eq('account_kind', 'WALLET_FLOAT');

      for (const row of floatRows || []) {
        const aid = (row as any).agent_id;
        const tid = agentToTerritory[aid];
        if (!tid) continue;
        const bal = Number((row as any).ledger_accounts?.balance || 0);
        const threshold = Number((row as any).cash_threshold_min ?? 200000);
        if (bal <= 0) requiringFloatByTerritory[tid] = (requiringFloatByTerritory[tid] || 0) + 1;
        else if (bal < threshold) underThresholdByTerritory[tid] = (underThresholdByTerritory[tid] || 0) + 1;
      }
    }

    // Real per-territory risk signal: open HIGH/CRITICAL alerts for agents
    // or merchants assigned to that territory.
    const { data: openAlerts } = await admin
      .from('aggregator_risk_alerts')
      .select('agent_id, merchant_id, entity_type, severity')
      .eq('aggregator_id', staff.aggregatorId)
      .eq('status', 'OPEN')
      .in('severity', ['HIGH', 'CRITICAL']);

    for (const a of openAlerts || []) {
      const tid = (a as any).entity_type === 'AGENT'
        ? agentToTerritory[(a as any).agent_id]
        : merchantToTerritory[(a as any).merchant_id];
      if (!tid) continue;
      openHighSeverityRiskByTerritory[tid] = (openHighSeverityRiskByTerritory[tid] || 0) + 1;
    }
  }

  const mapped = (territories || []).map((t: any) => {
    const requiringFloat = requiringFloatByTerritory[t.id] || 0;
    const underThreshold = underThresholdByTerritory[t.id] || 0;
    const liquidityHealth =
      requiringFloat > 0 ? 'CRITICAL' : underThreshold > 2 ? 'WATCH' : underThreshold > 0 ? 'NORMAL' : 'HEALTHY';

    const highRiskCount = openHighSeverityRiskByTerritory[t.id] || 0;
    const riskLevel = highRiskCount > 2 ? 'HIGH' : highRiskCount > 0 ? 'MEDIUM' : 'LOW';

    return {
      id: t.id,
      name: t.name,
      code: t.code,
      country: t.country,
      stateOrRegion: t.state_or_region || '',
      lgaOrCommune: t.lga_or_commune || '',
      supervisorName: t.supervisor_name || 'Unassigned',
      supervisorPhone: t.hub_phone || '',
      hubAddress: t.hub_address || '',
      activeAgentsCount: agentCounts[t.id] || 0,
      activeMerchantsCount: merchantCounts[t.id] || 0,
      todayTPV: tpvByTerritory[t.id] || 0,
      monthlyTPV: monthlyTpvByTerritory[t.id] || 0,
      aggregatorCommissionToday: commissionByTerritory[t.id] || 0,
      liquidityHealth,
      riskLevel,
    };
  });

  return createSuccessResponse({ territories: mapped }, { code: 'TERRITORIES_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
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

  const name = String(body.name || '').trim();
  const country = body.country === 'NE' ? 'NE' : 'NG';
  if (!name) {
    return createErrorResponse({ code: 'MISSING_FIELDS', message: 'Territory name is required.', requestId: staff.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();
  const code = `TER-${country}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const { data, error } = await admin
    .from('aggregator_territories')
    .insert({
      aggregator_id: staff.aggregatorId,
      name,
      code,
      country,
      state_or_region: body.stateOrRegion || null,
      lga_or_commune: body.lgaOrCommune || null,
      supervisor_name: body.supervisorName || null,
      hub_address: body.hubAddress || null,
      hub_phone: body.hubPhone || null,
    })
    .select()
    .single();

  if (error || !data) {
    return createErrorResponse({ code: 'TERRITORY_CREATE_FAILED', message: 'Could not create territory.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse({ id: data.id, code: data.code }, { code: 'TERRITORY_CREATED', requestId: staff.requestId, environment: 'PRODUCTION', status: 201 });
}
