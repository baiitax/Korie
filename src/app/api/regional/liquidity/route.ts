import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, liquidityStatus, orderCurrencies } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/liquidity — the regional liquidity command center.
 * Totals are broken down per currency (XOF first) and never combined.
 * The heatmap scores every float account against its configured cash
 * threshold using the documented coverage rule; aggregator-level rows roll
 * their agents' accounts up. All balances are ledger-authoritative.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.liquidity.view');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();

  const scope = await resolveTerritoryScope(manager);

  /* Aggregator registry + their own treasury accounts. */
  const aggregatorMeta = new Map<string, { code: string; name: string }>();
  if (scope.aggregatorIds.length > 0) {
    const { data: aggs } = await admin
      .from('aggregators')
      .select('id, aggregator_code, business_name, float_account_id, reserve_account_id, escrow_account_id')
      .in('id', scope.aggregatorIds);
    (aggs ?? []).forEach((a: any) => aggregatorMeta.set(a.id, { code: a.aggregator_code, name: a.business_name }));
  }

  /* Agent float accounts with real ledger balances. */
  interface HeatCell {
    aggregatorId: string;
    aggregatorCode: string;
    aggregatorName: string;
    currency: string;
    available: number;
    reserved: number;
    thresholdMin: number | null;
    coverage: number | null;
    status: 'HEALTHY' | 'MONITOR' | 'LOW' | 'CRITICAL';
    accounts: number;
  }
  const cells = new Map<string, HeatCell>();
  const totals: Record<string, { available: number; reserved: number }> = {};
  const lowFloat: { agentCode: string; agentName: string; state: string; currency: string; balance: number; threshold: number | null; status: string }[] = [];

  const aggOfAgent = new Map<string, string>();
  scope.agents.forEach((a) => {
    if (a.aggregator_territory_id) {
      const aggId = scope.aggregatorByTerritory.get(a.aggregator_territory_id);
      if (aggId) aggOfAgent.set(a.id, aggId);
    }
  });

  if (scope.agentIds.length > 0) {
    const { data: floatRows } = await admin
      .from('agent_float_accounts')
      .select('agent_id, account_kind, currency, cash_threshold_min, ledger_accounts(balance, locked_balance)')
      .in('agent_id', scope.agentIds);
    const agentMeta = new Map(scope.agents.map((a) => [a.id, a]));
    (floatRows ?? []).forEach((f: any) => {
      const la = Array.isArray(f.ledger_accounts) ? f.ledger_accounts[0] : f.ledger_accounts;
      if (!la) return;
      const agent = agentMeta.get(f.agent_id);
      const aggId = aggOfAgent.get(f.agent_id) || 'UNASSIGNED';
      const meta = aggregatorMeta.get(aggId) ?? { code: '—', name: 'Agents without aggregator territory' };
      const cur = f.currency || 'NGN';
      const balance = Number(la.balance || 0);
      const locked = Number(la.locked_balance || 0);
      const threshold = f.cash_threshold_min !== null && f.cash_threshold_min !== undefined ? Number(f.cash_threshold_min) : null;
      const st = liquidityStatus(balance, threshold);

      const key = `${aggId}:${cur}`;
      const cell =
        cells.get(key) ??
        ({ aggregatorId: aggId, aggregatorCode: meta.code, aggregatorName: meta.name, currency: cur, available: 0, reserved: 0, thresholdMin: null, coverage: null, status: 'HEALTHY', accounts: 0 } as HeatCell);
      cell.available += balance;
      cell.reserved += locked;
      cell.accounts += 1;
      if (threshold !== null) {
        cell.thresholdMin = (cell.thresholdMin ?? 0) + threshold;
      }
      const rank = { HEALTHY: 0, MONITOR: 1, LOW: 2, CRITICAL: 3 } as const;
      if (rank[st] > rank[cell.status]) cell.status = st;
      cells.set(key, cell);

      totals[cur] = totals[cur] || { available: 0, reserved: 0 };
      totals[cur].available += balance;
      totals[cur].reserved += locked;

      if (st === 'LOW' || st === 'CRITICAL') {
        lowFloat.push({
          agentCode: agent?.agent_code ?? '—',
          agentName: agent?.agent_name ?? '—',
          state: agent?.state_or_region ?? '—',
          currency: cur,
          balance,
          threshold,
          status: st,
        });
      }
    });
  }

  /* Aggregator-level house accounts (float/reserve/escrow). */
  const houseAccounts: { aggregator: string; kind: string; name: string; currency: string | null; balance: number; locked: number }[] = [];
  for (const [aggId, meta] of Array.from(aggregatorMeta.entries())) {
    const { data: agg } = await admin
      .from('aggregators')
      .select('float_account_id, reserve_account_id, escrow_account_id')
      .eq('id', aggId)
      .maybeSingle();
    if (!agg) continue;
    for (const [kind, id] of [
      ['FLOAT', agg.float_account_id],
      ['RESERVE', agg.reserve_account_id],
      ['ESCROW', agg.escrow_account_id],
    ] as const) {
      if (!id) continue;
      const { data: la } = await admin.from('ledger_accounts').select('name, currency, balance, locked_balance').eq('id', id).maybeSingle();
      if (la) {
        houseAccounts.push({ aggregator: `${meta.code} · ${meta.name}`, kind, name: la.name, currency: la.currency, balance: Number(la.balance || 0), locked: Number(la.locked_balance || 0) });
      }
    }
  }

  /* Pending liquidity (top-up requests awaiting review). */
  const pending: { id: string; agentCode: string; agentName: string; amount: number; currency: string; method: string | null; status: string; requestedAt: string }[] = [];
  let pendingTotals: Record<string, number> = {};
  if (scope.agentIds.length > 0) {
    const { data: reqRows } = await admin
      .from('agent_float_topup_requests')
      .select('id, agent_id, amount, currency, method, status, requested_at')
      .in('agent_id', scope.agentIds)
      .eq('status', 'PENDING')
      .order('requested_at', { ascending: false })
      .limit(100);
    const agentMeta = new Map(scope.agents.map((a) => [a.id, a]));
    (reqRows ?? []).forEach((r: any) => {
      const agent = agentMeta.get(r.agent_id);
      pending.push({
        id: r.id,
        agentCode: agent?.agent_code ?? '—',
        agentName: agent?.agent_name ?? '—',
        amount: Number(r.amount || 0),
        currency: r.currency,
        method: r.method ?? null,
        status: r.status,
        requestedAt: r.requested_at,
      });
      pendingTotals[r.currency] = (pendingTotals[r.currency] || 0) + Number(r.amount || 0);
    });
  }

  /* Finalize coverage on cells. */
  const heatmap = Array.from(cells.values()).map((c) => ({
    ...c,
    coverage: c.thresholdMin && c.thresholdMin > 0 ? Number((c.available / c.thresholdMin).toFixed(2)) : null,
  }));
  heatmap.sort((a, b) => a.currency.localeCompare(b.currency) || a.aggregatorName.localeCompare(b.aggregatorName));

  return createSuccessResponse(
    {
      country: manager.country,
      currencies: orderCurrencies([...Object.keys(totals), ...Object.keys(pendingTotals)]),
      totals,
      pendingTotals,
      heatmap,
      houseAccounts,
      lowFloat,
      pending,
      rules: 'Liquidity status: coverage = ledger balance ÷ configured cash threshold. CRITICAL <1.0 · LOW <1.5 · MONITOR <2.0 · HEALTHY ≥2.0. Values are never combined across currencies.',
    },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
