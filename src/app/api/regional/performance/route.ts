import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, activityClass, orderCurrencies } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/performance — aggregator comparison and regional
 * trends, all computed from real activity. Composite scoring is NOT
 * invented here: the page shows the raw dimensions; an official weighting
 * model would have to be defined and signed off first ("Performance
 * scoring — Planned").
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.aggregators.performance.view');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();

  const scope = await resolveTerritoryScope(manager);

  /* 30-day transactions per agent. */
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  const agentToAgg = new Map<string, string>();
  scope.agents.forEach((a) => {
    if (a.aggregator_territory_id) {
      const aggId = scope.aggregatorByTerritory.get(a.aggregator_territory_id);
      if (aggId) agentToAgg.set(a.id, aggId);
    }
  });

  const perAgent = new Map<string, { count: number; volume: number; currency: string; byStatus: Record<string, number>; lastAt: string | null }>();
  const dailyTrend: Record<string, { date: string; count: number; volume: number }[]> = {};
  const currencySet = new Set<string>();
  if (scope.agentIds.length > 0) {
    const { data: txRows } = await admin
      .from('agency_transactions')
      .select('agent_id, amount, currency, status, created_at')
      .in('agent_id', scope.agentIds)
      .gte('created_at', since30)
      .order('created_at', { ascending: false })
      .limit(50000);
    (txRows ?? []).forEach((tx: any) => {
      const cur = tx.currency || 'NGN';
      currencySet.add(cur);
      const e = perAgent.get(tx.agent_id) ?? { count: 0, volume: 0, currency: cur, byStatus: {} as Record<string, number>, lastAt: null };
      e.byStatus[tx.status] = (e.byStatus[tx.status] || 0) + 1;
      if (tx.status === 'SUCCESSFUL' || tx.status === 'COMPLETED') {
        e.count += 1;
        e.volume += Number(tx.amount || 0);
        if (!e.lastAt) e.lastAt = tx.created_at;
      }
      perAgent.set(tx.agent_id, e);

      const key = tx.created_at.slice(0, 10);
      dailyTrend[cur] = dailyTrend[cur] || [];
    });
    /* Build 30-day buckets per currency. */
    orderCurrencies(currencySet).forEach((cur) => {
      dailyTrend[cur] = [];
      for (let i = 29; i >= 0; i--) {
        dailyTrend[cur].push({ date: new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10), count: 0, volume: 0 });
      }
    });
    (txRows ?? []).forEach((tx: any) => {
      if (tx.status !== 'SUCCESSFUL' && tx.status !== 'COMPLETED') return;
      const cur = tx.currency || 'NGN';
      const arr = dailyTrend[cur];
      if (!arr) return;
      const key = tx.created_at.slice(0, 10);
      const bucket = arr.find((b) => b.date === key);
      if (bucket) {
        bucket.count += 1;
        bucket.volume += Number(tx.amount || 0);
      }
    });
  }

  /* Per-agent roll-up for the activity table. */
  const agentRows = scope.agents.map((a) => {
    const perf = perAgent.get(a.id);
    return {
      code: a.agent_code,
      name: a.agent_name,
      state: a.state_or_region,
      status: a.status,
      aggregator: a.aggregator_territory_id && scope.aggregatorByTerritory.has(a.aggregator_territory_id) ? scope.aggregatorByTerritory.get(a.aggregator_territory_id)! : null,
      tx30d: perf?.count ?? 0,
      volume30d: perf?.volume ?? 0,
      currency: perf?.currency ?? (manager.country === 'NG' ? 'NGN' : 'XOF'),
      successRate: perf && Object.values(perf.byStatus).reduce((s, n) => s + n, 0) > 0
        ? (perf.byStatus.SUCCESSFUL || 0) / Object.values(perf.byStatus).reduce((s, n) => s + n, 0)
        : null,
      activity: activityClass(perf?.lastAt ?? null),
      registeredAt: a.created_at,
    };
  });

  /* Aggregator comparison dimensions (raw metrics, no invented score). */
  const aggregatorComparison = scope.aggregatorIds.map((aggId) => {
    const agents = scope.agents.filter((a) => agentToAgg.get(a.id) === aggId);
    const rows = agentRows.filter((r) => r.aggregator === aggId);
    const totalTx = rows.reduce((s, r) => s + r.tx30d, 0);
    const successRates = rows.map((r) => r.successRate).filter((x): x is number => x !== null);
    return {
      aggregatorId: aggId,
      txCount30d: totalTx,
      activeAgents: agents.filter((a) => a.status === 'ACTIVE').length,
      newAgents30d: agents.filter((a) => new Date(a.created_at).getTime() >= Date.now() - 30 * 86400_000).length,
      totalAgents: agents.length,
      agentsActiveClass: rows.filter((r) => r.activity === 'ACTIVE').length,
      agentsDormant: rows.filter((r) => r.activity === 'DORMANT' || r.activity === 'NO_ACTIVITY').length,
      successRate: successRates.length > 0 ? successRates.reduce((s, x) => s + x, 0) / successRates.length : null,
      volumes: rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.currency] = (acc[r.currency] || 0) + r.volume30d;
        return acc;
      }, {}),
    };
  });

  /* Attach names. */
  const nameById = new Map<string, { code: string; name: string }>();
  if (scope.aggregatorIds.length > 0) {
    const { data: aggs } = await admin.from('aggregators').select('id, aggregator_code, business_name').in('id', scope.aggregatorIds);
    (aggs ?? []).forEach((a: any) => nameById.set(a.id, { code: a.aggregator_code, name: a.business_name }));
  }
  const comparison = aggregatorComparison.map((c) => ({
    ...c,
    code: nameById.get(c.aggregatorId)?.code ?? '—',
    name: nameById.get(c.aggregatorId)?.name ?? '—',
  }));
  comparison.sort((a, b) => b.txCount30d - a.txCount30d || a.name.localeCompare(b.name));

  return createSuccessResponse(
    {
      dailyTrend,
      agentRows: agentRows.sort((a, b) => b.tx30d - a.tx30d),
      comparison,
      scoringStatus: 'PLANNED',
      scoringNote: 'Composite performance scoring is not implemented — a documented weighting model must be approved first. The dimensions above are raw, computed from real activity.',
    },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
