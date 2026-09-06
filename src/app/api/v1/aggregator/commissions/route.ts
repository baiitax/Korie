import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/commissions
 *
 * Real commission summary derived from public.agent_commissions for every
 * agent in this aggregator's network. The aggregator's own share is modelled
 * as half of the real agent_commission recorded per transaction (the same
 * conservative, transparent split used in the transactions feed) — never an
 * independently fabricated number.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: agentRows } = await admin.from('agents').select('id').eq('org_id', staff.orgId);
  const agentIds = (agentRows || []).map((a: any) => a.id);

  const empty = {
    todayEarned: 0, thisWeekEarned: 0, thisMonthEarned: 0, pendingClearance: 0,
    approvedForPayout: 0, settledToBank: 0, lifetimeTotal: 0, byService: [],
  };

  if (agentIds.length === 0) {
    return createSuccessResponse(empty, { code: 'COMMISSIONS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
  }

  const { data: commissionRows } = await admin
    .from('agent_commissions')
    .select('amount, status, earned_at, settled_at, agency_transactions(transaction_type, amount)')
    .in('agent_id', agentIds);

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  let todayEarned = 0, thisWeekEarned = 0, thisMonthEarned = 0, pendingClearance = 0, approvedForPayout = 0, settledToBank = 0, lifetimeTotal = 0;
  const byServiceMap: Record<string, { volume: number; commission: number }> = {};

  for (const c of commissionRows || []) {
    const aggShare = Number((c as any).amount) * 0.5;
    const earnedAt = new Date((c as any).earned_at);
    lifetimeTotal += aggShare;
    if (earnedAt >= todayStart) todayEarned += aggShare;
    if (earnedAt >= weekStart) thisWeekEarned += aggShare;
    if (earnedAt >= monthStart) thisMonthEarned += aggShare;
    if ((c as any).status === 'EARNED') pendingClearance += aggShare;
    if ((c as any).status === 'PENDING_SETTLEMENT') approvedForPayout += aggShare;
    if ((c as any).status === 'PAID') settledToBank += aggShare;

    const tx: any = Array.isArray((c as any).agency_transactions) ? (c as any).agency_transactions[0] : (c as any).agency_transactions;
    const service = tx?.transaction_type || 'OTHER';
    if (!byServiceMap[service]) byServiceMap[service] = { volume: 0, commission: 0 };
    byServiceMap[service].volume += Number(tx?.amount || 0);
    byServiceMap[service].commission += aggShare;
  }

  const totalCommission = Object.values(byServiceMap).reduce((s, v) => s + v.commission, 0) || 1;
  const byService = Object.entries(byServiceMap).map(([serviceName, v]) => ({
    serviceName,
    volume: v.volume,
    commission: v.commission,
    percentage: Math.round((v.commission / totalCommission) * 1000) / 10,
  }));

  return createSuccessResponse(
    { todayEarned, thisWeekEarned, thisMonthEarned, pendingClearance, approvedForPayout, settledToBank, lifetimeTotal, byService },
    { code: 'COMMISSIONS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
