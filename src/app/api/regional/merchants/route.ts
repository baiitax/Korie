import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, maskPhone } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/merchants — merchant supervision. Territory-linked
 * merchants (via aggregator_territories) plus clearly-labelled country
 * context. Merchant acquisition volume runs through the payments engine;
 * where a territory link is absent that is shown honestly, not guessed.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.merchants.view');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();

  const scope = await resolveTerritoryScope(manager);
  const territoryIds = scope.territories.map((t) => t.id);

  /* Merchants linked to territories in the manager's region. */
  /* Aggregator distribution of territory-linked merchants. */
  const distribution = new Map<string, number>();
  const territoryToAgg = scope.aggregatorByTerritory;
  const linkedRaw: any[] = [];

  /* Country-wide context counts (labelled as such in the UI). */
  const { data: countryRows } = await admin
    .from('merchant_profiles')
    .select('status, kyb_status, category')
    .eq('country', manager.country)
    .limit(20000);
  const countryKpis = {
    total: countryRows?.length ?? 0,
    active: (countryRows ?? []).filter((m: any) => m.status === 'ACTIVE').length,
    pending: (countryRows ?? []).filter((m: any) => m.status === 'PENDING').length,
    verified: (countryRows ?? []).filter((m: any) => m.kyb_status === 'VERIFIED').length,
    restricted: (countryRows ?? []).filter((m: any) => ['SUSPENDED', 'RESTRICTED'].includes(m.status)).length,
    byCategory: {} as Record<string, number>,
  };
  (countryRows ?? []).forEach((m: any) => {
    countryKpis.byCategory[m.category] = (countryKpis.byCategory[m.category] || 0) + 1;
  });

  /* Aggregator distribution of territory-linked merchants. */
  if (territoryIds.length > 0) {
    const { data } = await admin
      .from('merchant_profiles')
      .select('id, merchant_code, business_name, trading_name, country, currency, category, tier, status, kyb_status, phone, aggregator_territory_id, created_at')
      .in('aggregator_territory_id', territoryIds)
      .order('created_at', { ascending: false })
      .limit(500);
    (data ?? []).forEach((m: any) => {
      linkedRaw.push(m);
      const aggId = m.aggregator_territory_id ? territoryToAgg.get(m.aggregator_territory_id) : null;
      const key = aggId || 'UNASSIGNED';
      distribution.set(key, (distribution.get(key) || 0) + 1);
    });
  }
  const aggregatorNames = new Map<string, string>();
  if (scope.aggregatorIds.length > 0) {
    const { data: aggs } = await admin.from('aggregators').select('id, aggregator_code, business_name').in('id', scope.aggregatorIds);
    (aggs ?? []).forEach((a: any) => aggregatorNames.set(a.id, `${a.aggregator_code} · ${a.business_name}`));
  }

  const merchants = linkedRaw.map((m) => ({
    id: m.id,
    code: m.merchant_code,
    businessName: m.business_name,
    tradingName: m.trading_name ?? null,
    country: m.country,
    currency: m.currency,
    category: m.category,
    tier: m.tier,
    status: m.status,
    kyb: m.kyb_status,
    aggregator: m.aggregator_territory_id && territoryToAgg.has(m.aggregator_territory_id) ? aggregatorNames.get(territoryToAgg.get(m.aggregator_territory_id)!) ?? null : null,
    registeredAt: m.created_at,
  }));

  return createSuccessResponse(
    {
      territoryMerchants: merchants.length,
      merchants,
      aggregatorDistribution: Array.from(distribution.entries()).map(([aggId, count]) => ({ aggregator: aggregatorNames.get(aggId) ?? 'Not linked to an aggregator territory', count })),
      countryKpis,
      note: 'Country-wide counts include merchants not yet linked to a territory in your region. Territory-linked merchants are listed individually.',
    },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
