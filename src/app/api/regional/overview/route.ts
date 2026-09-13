import { NextRequest } from 'next/server';
import { authenticateRegionalManagerRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/overview
 *
 * Territory dashboard — every number is a real aggregate over the manager's
 * territories (country + state/region names):
 *   • aggregators operating in the territory (via aggregator_territories)
 *   • agents by status (agents.state_or_region in territories, same country)
 *   • 30-day agency transaction volume/count per currency (agency_transactions)
 *   • agent float balances per currency (agent_float_accounts → ledger_accounts)
 *   • pending float top-ups, open risk alerts, open exceptions, active targets
 *
 * Sparse data is reported as sparse. Nothing is seeded to look busy.
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

  if (territories.length === 0) {
    return createErrorResponse({
      code: 'NO_TERRITORY_ASSIGNED',
      message: 'No territory is assigned to this regional manager yet.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 409,
    });
  }

  /* Aggregators with a territory inside the manager's region(s). */
  const { data: territoryRows } = await admin
    .from('aggregator_territories')
    .select('id, name, code, state_or_region, lga_or_commune, supervisor_name, aggregators(id, aggregator_code, business_name, status, kyb_status, tier)')
    .eq('country', country)
    .in('state_or_region', territories);

  const aggregatorIds: string[] = [];
  const aggregatorsById = new Map<string, { code: string; name: string; status: string; kyb: string; tier: string }>();
  (territoryRows ?? []).forEach((t: any) => {
    const agg = Array.isArray(t.aggregators) ? t.aggregators[0] : t.aggregators;
    if (agg?.id) {
      aggregatorIds.push(agg.id);
      aggregatorsById.set(agg.id, {
        code: agg.aggregator_code,
        name: agg.business_name,
        status: agg.status,
        kyb: agg.kyb_status ?? 'UNKNOWN',
        tier: agg.tier ?? '—',
      });
    }
  });

  /* Agents in the territory. */
  const { data: agents } = await admin
    .from('agents')
    .select('id, agent_code, agent_name, state_or_region, status, kyc_status, aggregator_territory_id')
    .eq('country', country)
    .in('state_or_region', territories);
  const agentRows = agents ?? [];
  const agentIds = agentRows.map((a: any) => a.id);
  const agentsByTerritory = new Map<string, any[]>();
  (territoryRows ?? []).forEach((t: any) => agentsByTerritory.set(t.id, []));
  agentRows.forEach((a: any) => {
    if (a.aggregator_territory_id && agentsByTerritory.has(a.aggregator_territory_id)) {
      agentsByTerritory.get(a.aggregator_territory_id)!.push(a);
    }
  });

  /* Real activity: agency transactions for these agents (30 days + all time). */
  let volumeByCurrency: Record<string, { count: number; volume: number }> = {};
  let volume30dByCurrency: Record<string, { count: number; volume: number }> = {};
  if (agentIds.length > 0) {
    const { data: txRows } = await admin
      .from('agency_transactions')
      .select('agent_id, amount, currency, status, created_at')
      .in('agent_id', agentIds)
      .order('created_at', { ascending: false })
      .limit(20000);
    const since = Date.now() - 30 * 86400_000;
    (txRows ?? []).forEach((tx: any) => {
      if (tx.status !== 'SUCCESSFUL' && tx.status !== 'COMPLETED') return;
      const cur = tx.currency || 'NGN';
      volumeByCurrency[cur] = volumeByCurrency[cur] || { count: 0, volume: 0 };
      volumeByCurrency[cur].count += 1;
      volumeByCurrency[cur].volume += Number(tx.amount || 0);
      if (new Date(tx.created_at).getTime() >= since) {
        volume30dByCurrency[cur] = volume30dByCurrency[cur] || { count: 0, volume: 0 };
        volume30dByCurrency[cur].count += 1;
        volume30dByCurrency[cur].volume += Number(tx.amount || 0);
      }
    });
  }

  /* Float balances for territory agents (real ledger balances). */
  const floatByCurrency: Record<string, number> = {};
  let floatAccountCount = 0;
  if (agentIds.length > 0) {
    const { data: floatRows } = await admin
      .from('agent_float_accounts')
      .select('agent_id, account_kind, currency, ledger_accounts(balance)')
      .in('agent_id', agentIds);
    (floatRows ?? []).forEach((f: any) => {
      const la = Array.isArray(f.ledger_accounts) ? f.ledger_accounts[0] : f.ledger_accounts;
      if (!la) return;
      floatAccountCount += 1;
      const cur = f.currency || 'NGN';
      floatByCurrency[cur] = (floatByCurrency[cur] || 0) + Number(la.balance || 0);
    });
  }

  /* Pending top-ups, open alerts, open exceptions, active targets. */
  let pendingTopups = 0;
  if (agentIds.length > 0) {
    const { count } = await admin
      .from('agent_float_topup_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING')
      .in('agent_id', agentIds);
    pendingTopups = count ?? 0;
  }

  let openAlerts = 0;
  if (aggregatorIds.length > 0) {
    const { count } = await admin
      .from('aggregator_risk_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'OPEN')
      .in('aggregator_id', aggregatorIds);
    openAlerts = count ?? 0;
  }

  let openExceptions = 0;
  if (aggregatorIds.length > 0) {
    const { count } = await admin
      .from('aggregator_exceptions')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null)
      .in('aggregator_id', aggregatorIds);
    openExceptions = count ?? 0;
  }

  let activeTargets = 0;
  if (aggregatorIds.length > 0) {
    const { count } = await admin
      .from('aggregator_targets')
      .select('id', { count: 'exact', head: true })
      .in('aggregator_id', aggregatorIds);
    activeTargets = count ?? 0;
  }

  /* Per-aggregator roll-up, all from the rows already fetched. */
  const agentIdSet = new Set(agentIds);
  const aggregators = Array.from(aggregatorsById.entries()).map(([id, meta]) => {
    const territoryAgents = (territoryRows ?? [])
      .filter((t: any) => {
        const agg = Array.isArray(t.aggregators) ? t.aggregators[0] : t.aggregators;
        return agg?.id === id;
      })
      .flatMap((t: any) => agentsByTerritory.get(t.id) ?? []);
    const linkedIds = new Set(territoryAgents.map((a: any) => a.id));
    return {
      id,
      ...meta,
      agentsTotal: territoryAgents.length,
      agentsActive: territoryAgents.filter((a: any) => a.status === 'ACTIVE').length,
      territories: (territoryRows ?? [])
        .filter((t: any) => {
          const agg = Array.isArray(t.aggregators) ? t.aggregators[0] : t.aggregators;
          return agg?.id === id;
        })
        .map((t: any) => ({ id: t.id, name: t.name, code: t.code, stateOrRegion: t.state_or_region })),
    };
  });

  return createSuccessResponse(
    {
      country,
      territories,
      aggregators,
      agents: {
        total: agentRows.length,
        active: agentRows.filter((a: any) => a.status === 'ACTIVE').length,
        pending: agentRows.filter((a: any) => a.status === 'PENDING').length,
        suspended: agentRows.filter((a: any) => a.status === 'SUSPENDED').length,
        kycVerified: agentRows.filter((a: any) => a.kyc_status === 'VERIFIED').length,
      },
      volumeByCurrency,
      volume30dByCurrency,
      floatByCurrency,
      floatAccountCount,
      pendingTopups,
      openAlerts,
      openExceptions,
      activeTargets,
    },
    { requestId: auth.manager.requestId, environment: 'PRODUCTION' },
  );
}
