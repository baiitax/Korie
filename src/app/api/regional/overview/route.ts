import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, liquidityStatus, activityClass, orderCurrencies } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/overview — the dashboard's KPI command center and
 * regional health module. Every number is a real aggregate over the
 * manager's territory; sparse data stays sparse.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.dashboard.view');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();

  const scope = await resolveTerritoryScope(manager);
  if (manager.territories.length === 0) {
    return createErrorResponse({
      code: 'NO_TERRITORY_ASSIGNED',
      message: 'No territory is assigned to this regional manager yet.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 409,
    });
  }

  /* Aggregator registry in scope. */
  const aggregatorMeta = new Map<string, { code: string; name: string; status: string; kyb: string; tier: string; createdAt: string }>();
  if (scope.aggregatorIds.length > 0) {
    const { data: aggs } = await admin
      .from('aggregators')
      .select('id, aggregator_code, business_name, status, kyb_status, tier, created_at')
      .in('id', scope.aggregatorIds);
    (aggs ?? []).forEach((a: any) =>
      aggregatorMeta.set(a.id, {
        code: a.aggregator_code,
        name: a.business_name,
        status: a.status,
        kyb: a.kyb_status ?? 'UNKNOWN',
        tier: a.tier ?? '—',
        createdAt: a.created_at,
      }),
    );
  }

  /* Agent roll-up. */
  const agentsByStatus = { ACTIVE: 0, INACTIVE: 0, PENDING: 0, SUSPENDED: 0 };
  let agentsKycVerified = 0;
  scope.agents.forEach((a) => {
    if (a.status in agentsByStatus) agentsByStatus[a.status as keyof typeof agentsByStatus] += 1;
  });

  /* Agency transactions (bounded window: 90 days is enough for KPIs). */
  const since90 = new Date(Date.now() - 90 * 86400_000).toISOString();
  let txRows: any[] = [];
  if (scope.agentIds.length > 0) {
    const { data } = await admin
      .from('agency_transactions')
      .select('agent_id, amount, currency, status, transaction_type, created_at')
      .in('agent_id', scope.agentIds)
      .gte('created_at', since90)
      .order('created_at', { ascending: false })
      .limit(50000);
    txRows = data ?? [];
  }
  const ok = (s: string) => s === 'SUCCESSFUL' || s === 'COMPLETED';
  const day = 86400_000;
  const now = Date.now();
  const volumeFor = (fromMs: number | null) => {
    const out: Record<string, { count: number; volume: number }> = {};
    txRows.forEach((tx) => {
      if (!ok(tx.status)) return;
      if (fromMs !== null && new Date(tx.created_at).getTime() < fromMs) return;
      const cur = tx.currency || 'NGN';
      out[cur] = out[cur] || { count: 0, volume: 0 };
      out[cur].count += 1;
      out[cur].volume += Number(tx.amount || 0);
    });
    return out;
  };
  const volumeToday = volumeFor(now - day);
  const volume7d = volumeFor(now - 7 * day);
  const volume30d = volumeFor(now - 30 * day);
  const volume90d = volumeFor(null);

  /* Transaction health (all statuses, 30d). */
  const txHealth: Record<string, number> = {};
  txRows.forEach((tx) => {
    if (new Date(tx.created_at).getTime() < now - 30 * day) return;
    txHealth[tx.status] = (txHealth[tx.status] || 0) + 1;
  });
  const tx30Total = Object.values(txHealth).reduce((s, n) => s + n, 0);
  const tx30Success = txHealth.SUCCESSFUL || 0;
  const successRate = tx30Total > 0 ? tx30Success / tx30Total : null;

  /* Per-day 30-day trend, per currency. */
  const trend: Record<string, { date: string; count: number; volume: number }[]> = {};
  const currencySet = new Set<string>();
  txRows.forEach((tx) => currencySet.add(tx.currency || 'NGN'));
  orderCurrencies(currencySet).forEach((cur) => {
    trend[cur] = [];
  });
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * day);
    const key = d.toISOString().slice(0, 10);
    orderCurrencies(currencySet).forEach((cur) => {
      trend[cur].push({ date: key, count: 0, volume: 0 });
    });
    txRows.forEach((tx) => {
      if (!ok(tx.status)) return;
      if (tx.created_at.slice(0, 10) !== key) return;
      const cur = tx.currency || 'NGN';
      const bucket = trend[cur]?.[trend[cur].length - 1];
      if (bucket) {
        bucket.count += 1;
        bucket.volume += Number(tx.amount || 0);
      }
    });
  }

  /* Float + liquidity health (real ledger balances vs thresholds). */
  const floatByCurrency: Record<string, number> = {};
  const liquidityBuckets = { HEALTHY: 0, MONITOR: 0, LOW: 0, CRITICAL: 0 };
  let floatAccountCount = 0;
  let lowFloatAgents = 0;
  const agentFloatByAgent = new Map<string, Record<string, number>>();
  if (scope.agentIds.length > 0) {
    const { data: floatRows } = await admin
      .from('agent_float_accounts')
      .select('agent_id, account_kind, currency, cash_threshold_min, ledger_accounts(balance)')
      .in('agent_id', scope.agentIds);
    const worstByAgent = new Map<string, LiquidityWorst>();
    (floatRows ?? []).forEach((f: any) => {
      const la = Array.isArray(f.ledger_accounts) ? f.ledger_accounts[0] : f.ledger_accounts;
      if (!la) return;
      floatAccountCount += 1;
      const bal = Number(la.balance || 0);
      const cur = f.currency || 'NGN';
      floatByCurrency[cur] = (floatByCurrency[cur] || 0) + bal;
      const per = agentFloatByAgent.get(f.agent_id) ?? {};
      per[cur] = (per[cur] || 0) + bal;
      agentFloatByAgent.set(f.agent_id, per);
      const st = liquidityStatus(bal, f.cash_threshold_min !== null && f.cash_threshold_min !== undefined ? Number(f.cash_threshold_min) : null);
      liquidityBuckets[st] += 1;
      const prev = worstByAgent.get(f.agent_id);
      const rank = { HEALTHY: 0, MONITOR: 1, LOW: 2, CRITICAL: 3 } as const;
      if (!prev || rank[st] > rank[prev]) worstByAgent.set(f.agent_id, st);
    });
    lowFloatAgents = Array.from(worstByAgent.values()).filter((s) => s === 'LOW' || s === 'CRITICAL').length;
  }
  type LiquidityWorst = 'HEALTHY' | 'MONITOR' | 'LOW' | 'CRITICAL';

  /* Pending top-ups. */
  let pendingTopups = 0;
  if (scope.agentIds.length > 0) {
    const { count } = await admin
      .from('agent_float_topup_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING')
      .in('agent_id', scope.agentIds);
    pendingTopups = count ?? 0;
  }

  /* Risk alerts + exceptions. */
  let openAlerts = 0;
  let openExceptions = 0;
  if (scope.aggregatorIds.length > 0) {
    const { count } = await admin
      .from('aggregator_risk_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'OPEN')
      .in('aggregator_id', scope.aggregatorIds);
    openAlerts = count ?? 0;
    const { count: ex } = await admin
      .from('aggregator_exceptions')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null)
      .in('aggregator_id', scope.aggregatorIds);
    openExceptions = ex ?? 0;
  }

  /* Support + escalations in the manager's jurisdiction. */
  let openTickets = 0;
  let slaAtRisk = 0;
  let openEscalations = 0;
  const { count: tCount } = await admin
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('jurisdiction', manager.country)
    .not('status', 'in', '(RESOLVED,CLOSED)');
  openTickets = tCount ?? 0;
  const { count: slaCount } = await admin
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('jurisdiction', manager.country)
    .not('status', 'in', '(RESOLVED,CLOSED)')
    .lt('resolution_due_at', new Date(Date.now() + 12 * 3600_000).toISOString());
  slaAtRisk = slaCount ?? 0;
  const { count: eCount } = await admin
    .from('support_escalations')
    .select('id', { count: 'exact', head: true })
    .not('status', 'in', '(RESOLVED,CLOSED)')
    .in('ticket_id', (await admin.from('support_tickets').select('id').eq('jurisdiction', manager.country).limit(5000)).data?.map((t: any) => t.id) ?? []);
  openEscalations = eCount ?? 0;

  /* KYC / compliance health. */
  const { data: agentKyc } = await admin
    .from('agents')
    .select('kyc_status')
    .eq('country', manager.country)
    .in('state_or_region', manager.territories);
  const kycBuckets: Record<string, number> = {};
  (agentKyc ?? []).forEach((a: any) => {
    kycBuckets[a.kyc_status] = (kycBuckets[a.kyc_status] || 0) + 1;
  });
  if (scope.agentIds.length > 0) {
    const { count: docPend } = await admin
      .from('agent_kyc_documents')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING')
      .in('agent_id', scope.agentIds);
    kycBuckets.DOCS_PENDING = docPend ?? 0;
  }

  /* Aggregator activity classification (last 30d tx per aggregator). */
  const txByAggregator = new Map<string, { count: number; volume: number; currency: string }>();
  const agentToAgg = new Map<string, string>();
  scope.agents.forEach((a) => {
    if (a.aggregator_territory_id) {
      const aggId = scope.aggregatorByTerritory.get(a.aggregator_territory_id);
      if (aggId) agentToAgg.set(a.id, aggId);
    }
  });
  txRows.forEach((tx) => {
    if (!ok(tx.status)) return;
    const aggId = agentToAgg.get(tx.agent_id);
    if (!aggId) return;
    const cur = tx.currency || 'NGN';
    const e = txByAggregator.get(aggId) ?? { count: 0, volume: 0, currency: cur };
    e.count += 1;
    e.volume += Number(tx.amount || 0);
    txByAggregator.set(aggId, e);
  });

  const aggregators = Array.from(aggregatorMeta.entries()).map(([id, meta]) => {
    const territoryAgents = scope.agents.filter(
      (a) => a.aggregator_territory_id && scope.aggregatorByTerritory.get(a.aggregator_territory_id) === id,
    );
    return {
      id,
      code: meta.code,
      name: meta.name,
      status: meta.status,
      kyb: meta.kyb,
      tier: meta.tier,
      agentsTotal: territoryAgents.length,
      agentsActive: territoryAgents.filter((a) => a.status === 'ACTIVE').length,
      tx30d: txByAggregator.get(id) ?? { count: 0, volume: 0, currency: manager.country === 'NG' ? 'NGN' : 'XOF' },
    };
  });

  /* Agent activity classes (from last successful transaction per agent). */
  const lastTxByAgent = new Map<string, string>();
  txRows.forEach((tx) => {
    if (!ok(tx.status)) return;
    if (!lastTxByAgent.has(tx.agent_id)) lastTxByAgent.set(tx.agent_id, tx.created_at);
  });
  const activityBuckets = { ACTIVE: 0, LOW_ACTIVITY: 0, DORMANT: 0, NO_ACTIVITY: 0 };
  scope.agents.forEach((a) => {
    activityBuckets[activityClass(lastTxByAgent.get(a.id))] += 1;
  });

  return createSuccessResponse(
    {
      country: manager.country,
      territories: manager.territories,
      generatedAt: new Date().toISOString(),
      kpis: {
        aggregators: {
          total: aggregators.length,
          active: aggregators.filter((a) => a.status === 'ACTIVE').length,
          inactive: aggregators.filter((a) => a.status === 'INACTIVE').length,
          suspended: aggregators.filter((a) => a.status === 'SUSPENDED' || a.status === 'REVIEW').length,
        },
        agents: {
          total: scope.agents.length,
          active: agentsByStatus.ACTIVE,
          inactive: agentsByStatus.INACTIVE + agentsByStatus.SUSPENDED,
          pending: agentsByStatus.PENDING,
        },
        volumeToday,
        volume7d,
        volume30d,
        volume90d,
      },
      health: {
        aggregator: { healthy: aggregators.filter((a) => a.status === 'ACTIVE').length, attention: aggregators.filter((a) => a.status === 'REVIEW' || a.status === 'PENDING').length, atRisk: aggregators.filter((a) => a.tx30d.count === 0).length, suspended: aggregators.filter((a) => a.status === 'SUSPENDED').length },
        agents: activityBuckets,
        liquidity: { ...liquidityBuckets, lowFloatAgents },
        transactions: { total30d: tx30Total, successRate, byStatus: txHealth },
        compliance: kycBuckets,
      },
      trend,
      floatByCurrency,
      floatAccountCount,
      pendingTopups,
      openAlerts,
      openExceptions,
      support: { openTickets, slaAtRisk, openEscalations },
      aggregators,
    },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
