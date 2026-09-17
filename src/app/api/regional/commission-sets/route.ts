import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, orderCurrencies } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/commission-sets — the commission schedule that applies
 * to aggregator transactions, plus what it has paid the aggregators
 * operating inside this manager's territory.
 *
 * Honesty rules, same as every /api/regional route:
 *   - the rate rows are the PLATFORM-WIDE schedule (agent_commission_rates).
 *     There are no per-aggregator or per-manager rate overrides, and the
 *     response says so rather than implying a territory-specific schedule;
 *   - earnings come from the commission engine's own table
 *     (agent_commissions), scoped to the manager's resolved territory —
 *     never from client-supplied ids;
 *   - a territory with no commissions is reported as empty, not zeroed-in.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.commissions.view');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();

  const scope = await resolveTerritoryScope(manager);

  /* The platform-wide schedule — identical for every aggregator. */
  const { data: rateRows, error: rateErr } = await admin
    .from('agent_commission_rates')
    .select('id, transaction_type, currency, min_amount, max_amount, customer_fee_flat, customer_fee_bps, agent_commission_flat, agent_commission_bps, is_active, created_at, updated_at')
    .order('transaction_type', { ascending: true })
    .order('currency', { ascending: true })
    .order('min_amount', { ascending: true })
    .limit(500);

  if (rateErr) {
    return createErrorResponse(
      { code: 'COMMISSION_SETS_FAILED', message: rateErr.message, httpStatus: 500, requestId: `KP-REQ-${Date.now()}` },
    );
  }

  /* Aggregators in scope + their commissions, from the engine's tables. */
  const aggregatorIds = scope.aggregatorIds;
  let byAggregator: unknown[] = [];
  const totals: Record<string, { earned: number; settled: number; count: number }> = {};

  if (aggregatorIds.length > 0) {
    const [aggRes, commRes] = await Promise.all([
      admin.from('aggregators').select('id, aggregator_code, business_name, status, country').in('id', aggregatorIds).order('aggregator_code'),
      admin
        .from('agent_commissions')
        .select('agent_id, amount, currency, status, earned_at')
        .in('agent_id', scope.agentIds)
        .order('earned_at', { ascending: false })
        .limit(50000),
    ]);

    if (aggRes.error || commRes.error) {
      return createErrorResponse(
        { code: 'COMMISSION_SETS_FAILED', message: (aggRes.error ?? commRes.error)!.message, httpStatus: 500, requestId: `KP-REQ-${Date.now()}` },
      );
    }

    /* agent → territory → aggregator, from the resolved scope only. */
    const agentAggregator = new Map<string, string>();
    for (const agent of scope.agents) {
      if (!agent.aggregator_territory_id) continue;
      const aggId = scope.aggregatorByTerritory.get(agent.aggregator_territory_id);
      if (aggId) agentAggregator.set(agent.id, aggId);
    }
    const territoryByAggregator = new Map<string, { name: string; stateOrRegion: string }[]>();
    for (const t of scope.territories) {
      if (!t.aggregator_id) continue;
      const list = territoryByAggregator.get(t.aggregator_id) ?? [];
      list.push({ name: t.name, stateOrRegion: t.state_or_region });
      territoryByAggregator.set(t.aggregator_id, list);
    }

    byAggregator = (aggRes.data ?? []).map((agg: Record<string, unknown>) => {
      const byCurrency: Record<string, { earned: number; settled: number; count: number }> = {};
      let lastEarnedAt: string | null = null;
      let commissionCount = 0;
      for (const cm of commRes.data ?? []) {
        if (agentAggregator.get(String(cm.agent_id)) !== String(agg.id)) continue;
        const cur = String(cm.currency || 'NGN');
        const amount = Number(cm.amount || 0);
        byCurrency[cur] = byCurrency[cur] ?? { earned: 0, settled: 0, count: 0 };
        byCurrency[cur].count += 1;
        commissionCount += 1;
        if (cm.status === 'SETTLED') byCurrency[cur].settled += amount;
        else byCurrency[cur].earned += amount;
        totals[cur] = totals[cur] ?? { earned: 0, settled: 0, count: 0 };
        totals[cur].count += 1;
        if (cm.status === 'SETTLED') totals[cur].settled += amount;
        else totals[cur].earned += amount;
        if (!lastEarnedAt && cm.earned_at) lastEarnedAt = String(cm.earned_at);
      }
      return {
        aggregatorId: String(agg.id),
        code: String(agg.aggregator_code ?? '—'),
        businessName: String(agg.business_name ?? '—'),
        status: String(agg.status ?? '—'),
        territories: territoryByAggregator.get(String(agg.id)) ?? [],
        agentsInTerritory: scope.agents.filter((a) => agentAggregator.get(a.id) === String(agg.id)).length,
        byCurrency,
        commissionCount,
        lastEarnedAt,
      };
    });
  }

  return createSuccessResponse(
    {
      sets: (rateRows ?? []).map((r: Record<string, unknown>) => ({
        id: String(r.id),
        transactionType: String(r.transaction_type ?? ''),
        currency: String(r.currency ?? ''),
        minAmount: Number(r.min_amount ?? 0),
        maxAmount: r.max_amount === null || r.max_amount === undefined ? null : Number(r.max_amount),
        customerFeeFlat: Number(r.customer_fee_flat ?? 0),
        customerFeeBps: Number(r.customer_fee_bps ?? 0),
        agentCommissionFlat: Number(r.agent_commission_flat ?? 0),
        agentCommissionBps: Number(r.agent_commission_bps ?? 0),
        isActive: r.is_active === true,
        setAt: String(r.created_at ?? ''),
      })),
      byAggregator,
      totals,
      currencies: orderCurrencies(Object.keys(totals)),
      scopeSummary: {
        territoryCount: scope.territories.length,
        aggregatorCount: aggregatorIds.length,
        agentCount: scope.agents.length,
      },
      scheduleNote:
        'One platform-wide schedule applies to every aggregator — these rows are what the commission engine prices transactions with; there are no per-aggregator or per-manager overrides.',
    },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
