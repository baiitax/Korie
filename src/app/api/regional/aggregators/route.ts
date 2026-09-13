import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, aggregatorInScope } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/aggregators — server-side paginated, filtered, sorted
 * aggregator register for the manager's territory. Page size is capped;
 * the full regional dataset is never shipped to the browser.
 *
 * Query: page, pageSize (≤50), q (search), status, sort (name|volume|agents),
 * from/to (date range for the activity columns).
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.aggregators.view');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();
  const url = new URL(req.url);

  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get('pageSize') || 10)));
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const statusFilter = url.searchParams.get('status') || '';
  const sort = url.searchParams.get('sort') || 'name';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const since = from ? new Date(from).toISOString() : new Date(Date.now() - 30 * 86400_000).toISOString();
  const until = to ? new Date(to).toISOString() : null;

  const scope = await resolveTerritoryScope(manager);

  /* Aggregators in scope. */
  const rows: any[] = [];
  if (scope.aggregatorIds.length > 0) {
    const { data: aggs } = await admin
      .from('aggregators')
      .select('id, aggregator_code, business_name, status, kyb_status, tier, country, currency, contact_email, contact_phone, created_at, float_account_id, reserve_account_id, escrow_account_id')
      .in('id', scope.aggregatorIds);
    (aggs ?? []).forEach((a: any) => rows.push(a));
  }

  /* Agents per aggregator. */
  const agentsByAgg = new Map<string, { total: number; active: number }>();
  scope.agents.forEach((a) => {
    if (!a.aggregator_territory_id) return;
    const aggId = scope.aggregatorByTerritory.get(a.aggregator_territory_id);
    if (!aggId) return;
    const e = agentsByAgg.get(aggId) ?? { total: 0, active: 0 };
    e.total += 1;
    if (a.status === 'ACTIVE') e.active += 1;
    agentsByAgg.set(aggId, e);
  });

  /* Activity per aggregator inside the requested window. */
  const agentToAgg = new Map<string, string>();
  scope.agents.forEach((a) => {
    if (a.aggregator_territory_id) {
      const aggId = scope.aggregatorByTerritory.get(a.aggregator_territory_id);
      if (aggId) agentToAgg.set(a.id, aggId);
    }
  });
  const txByAgg = new Map<string, Record<string, { count: number; volume: number }>>();
  if (scope.agentIds.length > 0) {
    const { data: txRows } = await admin
      .from('agency_transactions')
      .select('agent_id, amount, currency, status, created_at')
      .in('agent_id', scope.agentIds)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50000);
    (txRows ?? []).forEach((tx: any) => {
      if (tx.status !== 'SUCCESSFUL' && tx.status !== 'COMPLETED') return;
      if (until && new Date(tx.created_at).getTime() > new Date(until).getTime()) return;
      const aggId = agentToAgg.get(tx.agent_id);
      if (!aggId) return;
      const cur = tx.currency || 'NGN';
      const per = txByAgg.get(aggId) ?? {};
      per[cur] = per[cur] || { count: 0, volume: 0 };
      per[cur].count += 1;
      per[cur].volume += Number(tx.amount || 0);
      txByAgg.set(aggId, per);
    });
  }

  /* Commissions per aggregator (agent commissions earned by its agents). */
  const commissionByAgg = new Map<string, Record<string, { earned: number; settled: number }>>();
  if (scope.agentIds.length > 0) {
    const { data: commRows } = await admin
      .from('agent_commissions')
      .select('agent_id, amount, currency, status')
      .in('agent_id', scope.agentIds)
      .limit(20000);
    (commRows ?? []).forEach((cm: any) => {
      const aggId = agentToAgg.get(cm.agent_id);
      if (!aggId) return;
      const cur = cm.currency || 'NGN';
      const per = commissionByAgg.get(aggId) ?? {};
      per[cur] = per[cur] || { earned: 0, settled: 0 };
      if (cm.status === 'SETTLED') per[cur].settled += Number(cm.amount || 0);
      else per[cur].earned += Number(cm.amount || 0);
      commissionByAgg.set(aggId, per);
    });
  }

  /* Open risk alerts per aggregator. */
  const alertsByAgg = new Map<string, number>();
  if (scope.aggregatorIds.length > 0) {
    const { data: alertRows } = await admin
      .from('aggregator_risk_alerts')
      .select('aggregator_id')
      .eq('status', 'OPEN')
      .in('aggregator_id', scope.aggregatorIds);
    (alertRows ?? []).forEach((a: any) => alertsByAgg.set(a.aggregator_id, (alertsByAgg.get(a.aggregator_id) || 0) + 1));
  }

  /* Territory display names. */
  const territoriesByAgg = new Map<string, string[]>();
  scope.territories.forEach((t) => {
    const list = territoriesByAgg.get(t.aggregator_id) ?? [];
    list.push(t.state_or_region);
    territoriesByAgg.set(t.aggregator_id, list);
  });

  /* Assemble, filter, sort, paginate — all server-side. */
  let items = rows.map((a) => ({
    id: a.id,
    code: a.aggregator_code,
    name: a.business_name,
    status: a.status,
    kyb: a.kyb_status ?? 'UNKNOWN',
    tier: a.tier ?? '—',
    currency: a.currency ?? null,
    regions: territoriesByAgg.get(a.id) ?? [],
    agents: agentsByAgg.get(a.id) ?? { total: 0, active: 0 },
    volumeByCurrency: txByAgg.get(a.id) ?? {},
    commissionByCurrency: commissionByAgg.get(a.id) ?? {},
    openAlerts: alertsByAgg.get(a.id) ?? 0,
    createdAt: a.created_at,
  }));

  if (q) {
    items = items.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.regions.some((r: string) => r.toLowerCase().includes(q)));
  }
  if (statusFilter) items = items.filter((i) => i.status === statusFilter);

  const volumeOf = (i: (typeof items)[number]) => Object.values(i.volumeByCurrency).reduce((s, v) => s + v.volume, 0);
  if (sort === 'volume') items.sort((a, b) => volumeOf(b) - volumeOf(a));
  else if (sort === 'agents') items.sort((a, b) => b.agents.total - a.agents.total);
  else items.sort((a, b) => a.name.localeCompare(b.name));

  const total = items.length;
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return createSuccessResponse(
    { items: pageItems, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)), window: { from: since, to: until } },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
