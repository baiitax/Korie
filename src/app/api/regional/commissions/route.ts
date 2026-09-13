import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, maskName, orderCurrencies } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/commissions — commission monitoring for the territory.
 * All figures come from the commission engine's own tables
 * (agent_commissions) and agency_transactions.agent_commission — never
 * from client-supplied amounts. Broken down per currency.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.commissions.view');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();

  const scope = await resolveTerritoryScope(manager);
  if (scope.agentIds.length === 0) {
    return createSuccessResponse(
      { totals: {}, byStatus: {}, byAgent: [], monthlyTrend: {}, transactionLinked: {} },
      { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
    );
  }

  const { data: commRows } = await admin
    .from('agent_commissions')
    .select('agent_id, amount, currency, status, earned_at, settled_at')
    .in('agent_id', scope.agentIds)
    .order('earned_at', { ascending: false })
    .limit(50000);

  const totals: Record<string, { earned: number; settled: number; count: number }> = {};
  const byStatus: Record<string, number> = {};
  const monthly: Record<string, Record<string, number>> = {};
  const perAgent = new Map<string, { code: string; name: string; state: string; byCurrency: Record<string, { earned: number; settled: number; count: number }>; lastEarnedAt: string | null }>();
  const agentMeta = new Map(scope.agents.map((a) => [a.id, a]));

  (commRows ?? []).forEach((cm: any) => {
    const cur = cm.currency || 'NGN';
    totals[cur] = totals[cur] || { earned: 0, settled: 0, count: 0 };
    totals[cur].count += 1;
    byStatus[cm.status] = (byStatus[cm.status] || 0) + 1;
    if (cm.status === 'SETTLED') totals[cur].settled += Number(cm.amount || 0);
    else totals[cur].earned += Number(cm.amount || 0);

    const month = String(cm.earned_at || '').slice(0, 7);
    if (month) {
      monthly[cur] = monthly[cur] || {};
      monthly[cur][month] = (monthly[cur][month] || 0) + Number(cm.amount || 0);
    }

    const agent = agentMeta.get(cm.agent_id);
    const key = cm.agent_id;
    const e =
      perAgent.get(key) ??
      { code: agent?.agent_code ?? '—', name: maskName(agent?.agent_name), state: agent?.state_or_region ?? '—', byCurrency: {}, lastEarnedAt: null };
    e.byCurrency[cur] = e.byCurrency[cur] || { earned: 0, settled: 0, count: 0 };
    e.byCurrency[cur].count += 1;
    if (cm.status === 'SETTLED') e.byCurrency[cur].settled += Number(cm.amount || 0);
    else e.byCurrency[cur].earned += Number(cm.amount || 0);
    if (!e.lastEarnedAt) e.lastEarnedAt = cm.earned_at;
    perAgent.set(key, e);
  });

  /* Transaction-linked commission from the agency ledger itself. */
  const { data: txRows } = await admin
    .from('agency_transactions')
    .select('agent_commission, currency, status')
    .in('agent_id', scope.agentIds)
    .limit(50000);
  const transactionLinked: Record<string, { successful: number; total: number }> = {};
  (txRows ?? []).forEach((tx: any) => {
    const c = tx.agent_commission === null ? 0 : Number(tx.agent_commission);
    if (c <= 0) return;
    const cur = tx.currency || 'NGN';
    transactionLinked[cur] = transactionLinked[cur] || { successful: 0, total: 0 };
    transactionLinked[cur].total += c;
    if (tx.status === 'SUCCESSFUL' || tx.status === 'COMPLETED') transactionLinked[cur].successful += c;
  });

  const byAgent = Array.from(perAgent.values()).sort((a, b) => (b.lastEarnedAt || '').localeCompare(a.lastEarnedAt || ''));

  return createSuccessResponse(
    {
      currencies: orderCurrencies(Object.keys(totals)),
      totals,
      byStatus,
      byAgent,
      monthlyTrend: monthly,
      transactionLinked,
    },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
