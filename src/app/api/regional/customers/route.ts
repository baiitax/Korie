import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, maskName, maskPhone } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/customers — regional customer ANALYTICS with masked
 * PII. The role has customers.view_limited: counts, tiers, statuses and
 * acquisition through the agency network — never identity documents, never
 * unmasked personal data. Scoped to the manager's country.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.customers.view_limited');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();

  const scope = await resolveTerritoryScope(manager);

  /* Country-wide customer analytics (the customers register is
   * country-scoped, not state-scoped). */
  const { data: custRows } = await admin
    .from('customers')
    .select('id, kyc_tier, status, created_at')
    .eq('country', manager.country)
    .limit(20000);

  const since30 = Date.now() - 30 * 86400_000;
  const kpis = {
    total: custRows?.length ?? 0,
    new30d: (custRows ?? []).filter((c: any) => new Date(c.created_at).getTime() >= since30).length,
    active: (custRows ?? []).filter((c: any) => c.status === 'ACTIVE').length,
    restricted: (custRows ?? []).filter((c: any) => ['RESTRICTED', 'SUSPENDED', 'FROZEN'].includes(c.status)).length,
    byTier: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
  };
  (custRows ?? []).forEach((c: any) => {
    kpis.byTier[c.kyc_tier] = (kpis.byTier[c.kyc_tier] || 0) + 1;
    kpis.byStatus[c.status] = (kpis.byStatus[c.status] || 0) + 1;
  });

  /* Verification statuses (country). */
  const { data: verRows } = await admin
    .from('customer_verification_status')
    .select('verification_status')
    .limit(20000);
  const verification: Record<string, number> = {};
  (verRows ?? []).forEach((v: any) => {
    verification[v.verification_status] = (verification[v.verification_status] || 0) + 1;
  });

  /* Customers served through the manager's territory agents (the agency
   * walk-in network). PII masked. */
  const agencyCustomers: { name: string; phone: string; agent: string; kycTier: string | null; verified: boolean | null; txCount: number | null; lastActivity: string | null }[] = [];
  let agencyAcquisitionByAgent: { agentCode: string; agentName: string; state: string; customers: number }[] = [];
  if (scope.agentIds.length > 0) {
    const { data: acRows } = await admin
      .from('agency_customers')
      .select('agent_id, full_name, phone, kyc_tier, is_verified, total_transactions_count, last_activity_at')
      .in('agent_id', scope.agentIds)
      .order('created_at', { ascending: false })
      .limit(200);
    const agentMeta = new Map(scope.agents.map((a) => [a.id, a]));
    (acRows ?? []).forEach((r: any) => {
      const agent = agentMeta.get(r.agent_id);
      agencyCustomers.push({
        name: maskName(r.full_name),
        phone: maskPhone(r.phone),
        agent: agent ? `${agent.agent_code}` : '—',
        kycTier: r.kyc_tier ?? null,
        verified: r.is_verified ?? null,
        txCount: r.total_transactions_count ?? null,
        lastActivity: r.last_activity_at ?? null,
      });
    });

    /* Distinct walk-in customers seen in agency transactions (30d). */
    const { data: txRows } = await admin
      .from('agency_transactions')
      .select('agent_id, customer_id')
      .in('agent_id', scope.agentIds)
      .gte('created_at', new Date(since30).toISOString())
      .limit(50000);
    const perAgent = new Map<string, Set<string>>();
    (txRows ?? []).forEach((tx: any) => {
      if (!tx.customer_id) return;
      const set = perAgent.get(tx.agent_id) ?? new Set<string>();
      set.add(tx.customer_id);
      perAgent.set(tx.agent_id, set);
    });
    agencyAcquisitionByAgent = scope.agents
      .filter((a) => perAgent.has(a.id))
      .map((a) => ({ agentCode: a.agent_code, agentName: maskName(a.agent_name), state: a.state_or_region, customers: perAgent.get(a.id)!.size }));
  }

  return createSuccessResponse(
    {
      country: manager.country,
      kpis,
      verification,
      agencyServed30d: agencyAcquisitionByAgent.reduce((s, a) => s + a.customers, 0),
      agencyAcquisitionByAgent,
      agencyCustomers,
    },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
