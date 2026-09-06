import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/me
 *
 * Returns the authenticated aggregator organization's own real profile +
 * live float/reserve/escrow ledger balances + real network counts — the
 * single source of truth replacing the CURRENT_AGGREGATOR fixture. A
 * freshly seeded/registered, unverified aggregator simply has zero
 * balances/counts until real activity occurs.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: agg, error } = await admin
    .from('aggregators')
    .select(
      'id, org_id, aggregator_code, business_name, legal_entity, rc_number, country, currency, tier, status, kyb_status, headquarters, contact_email, contact_phone, settlement_bank, settlement_account_number, float_account_id, reserve_account_id, escrow_account_id, created_at',
    )
    .eq('id', staff.aggregatorId)
    .single();

  if (error || !agg) {
    return createErrorResponse({ code: 'AGGREGATOR_PROFILE_LOOKUP_FAILED', message: 'Could not load aggregator profile.', requestId: staff.requestId, httpStatus: 500 });
  }

  const accountIds = [agg.float_account_id, agg.reserve_account_id, agg.escrow_account_id].filter(Boolean) as string[];
  let floatBalance = 0;
  let reserveBalance = 0;
  let escrowBalance = 0;
  if (accountIds.length > 0) {
    const { data: accounts } = await admin.from('ledger_accounts').select('id, balance').in('id', accountIds);
    const byId: Record<string, number> = {};
    for (const a of accounts || []) byId[(a as any).id] = Number((a as any).balance);
    floatBalance = byId[agg.float_account_id || ''] || 0;
    reserveBalance = byId[agg.reserve_account_id || ''] || 0;
    escrowBalance = byId[agg.escrow_account_id || ''] || 0;
  }

  const { count: activeAgentsCount } = await admin
    .from('agents')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', agg.org_id)
    .eq('status', 'ACTIVE');

  const { count: inactiveAgentsCount } = await admin
    .from('agents')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', agg.org_id)
    .neq('status', 'ACTIVE');

  const { count: activeMerchantsCount } = await admin
    .from('merchant_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', agg.org_id)
    .eq('status', 'ACTIVE');

  const { count: inactiveMerchantsCount } = await admin
    .from('merchant_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', agg.org_id)
    .neq('status', 'ACTIVE');

  const { data: networkAgents } = await admin.from('agents').select('id').eq('org_id', agg.org_id);
  const agentIds = (networkAgents || []).map((a: any) => a.id);

  const todayStart = new Date().toISOString().slice(0, 10);
  let totalNetworkTPVToday = 0;
  let totalNetworkTransactionsToday = 0;
  if (agentIds.length > 0) {
    const { data: todayTx } = await admin
      .from('agency_transactions')
      .select('amount, agent_commission, status')
      .in('agent_id', agentIds)
      .gte('created_at', todayStart);
    for (const t of todayTx || []) {
      if (['SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION'].includes((t as any).status)) {
        totalNetworkTPVToday += Number((t as any).amount);
        totalNetworkTransactionsToday += 1;
      }
    }
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  let totalNetworkTPVMonth = 0;
  if (agentIds.length > 0) {
    const { data: monthTx } = await admin
      .from('agency_transactions')
      .select('amount, status')
      .in('agent_id', agentIds)
      .gte('created_at', monthStart.toISOString());
    for (const t of monthTx || []) {
      if (['SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION'].includes((t as any).status)) {
        totalNetworkTPVMonth += Number((t as any).amount);
      }
    }
  }

  let pendingCommissions = 0;
  let settledCommissionsThisMonth = 0;
  if (agentIds.length > 0) {
    const { data: commissionRows } = await admin
      .from('agent_commissions')
      .select('amount, status, settled_at')
      .in('agent_id', agentIds);
    for (const c of commissionRows || []) {
      if ((c as any).status === 'EARNED') pendingCommissions += Number((c as any).amount);
      if ((c as any).status === 'PAID' && (c as any).settled_at && new Date((c as any).settled_at) >= monthStart) {
        settledCommissionsThisMonth += Number((c as any).amount);
      }
    }
  }

  return createSuccessResponse(
    {
      id: agg.id,
      name: agg.business_name,
      code: agg.aggregator_code,
      rcNumber: agg.rc_number || '',
      country: agg.country,
      currency: agg.currency,
      tier: agg.tier,
      status: agg.status,
      kybStatus: agg.kyb_status,
      headquarters: agg.headquarters || '',
      contactEmail: agg.contact_email,
      contactPhone: agg.contact_phone,
      walletBalance: floatBalance,
      availableLiquidity: floatBalance,
      reserveBalance,
      escrowBalance,
      pendingCommissions,
      settledCommissionsThisMonth,
      totalNetworkTPVToday,
      totalNetworkTPVMonth,
      totalNetworkTransactionsToday,
      activeAgentsCount: activeAgentsCount || 0,
      inactiveAgentsCount: inactiveAgentsCount || 0,
      activeMerchantsCount: activeMerchantsCount || 0,
      inactiveMerchantsCount: inactiveMerchantsCount || 0,
      settlementBank: agg.settlement_bank || 'Not yet configured',
      settlementAccountMasked: agg.settlement_account_number ? `****${String(agg.settlement_account_number).slice(-4)}` : '—',
      createdAt: agg.created_at,
      staffRole: staff.role,
      staffTerritoryScope: staff.territoryScope,
    },
    { code: 'AGGREGATOR_PROFILE_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
