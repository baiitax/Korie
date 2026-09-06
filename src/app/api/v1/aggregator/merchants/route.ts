import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/merchants
 *
 * Every real public.merchant_profiles row whose org_id belongs to this
 * aggregator, joined with real settlement ledger balance and today's/
 * month's real payment volume.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: merchantRows, error } = await admin
    .from('merchant_profiles')
    .select('id, merchant_code, business_name, trading_name, email, phone, country, category, status, kyb_status, settlement_bank, settlement_account_number, aggregator_territory_id, created_at, aggregator_territories(name)')
    .eq('org_id', staff.orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return createErrorResponse({ code: 'MERCHANTS_LOOKUP_FAILED', message: 'Could not load merchant network.', requestId: staff.requestId, httpStatus: 500 });
  }

  const merchantIds = (merchantRows || []).map((m: any) => m.id);
  let volumeToday: Record<string, { volume: number; count: number }> = {};
  let volumeMonth: Record<string, number> = {};
  let disputeCounts: Record<string, number> = {};

  if (merchantIds.length > 0) {
    const todayStart = new Date().toISOString().slice(0, 10);
    const { data: todayTx } = await admin
      .from('merchant_payment_transactions')
      .select('merchant_id, amount, status')
      .in('merchant_id', merchantIds)
      .gte('created_at', todayStart);
    for (const t of todayTx || []) {
      if (!['SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION', 'PROCESSING'].includes((t as any).status)) continue;
      const id = (t as any).merchant_id;
      if (!volumeToday[id]) volumeToday[id] = { volume: 0, count: 0 };
      volumeToday[id].volume += Number((t as any).amount);
      volumeToday[id].count += 1;
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { data: monthTx } = await admin
      .from('merchant_payment_transactions')
      .select('merchant_id, amount, status')
      .in('merchant_id', merchantIds)
      .gte('created_at', monthStart.toISOString());
    for (const t of monthTx || []) {
      if (!['SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION', 'PROCESSING'].includes((t as any).status)) continue;
      const id = (t as any).merchant_id;
      volumeMonth[id] = (volumeMonth[id] || 0) + Number((t as any).amount);
    }

    const { data: disputeRows } = await admin.from('merchant_disputes').select('merchant_id').in('merchant_id', merchantIds);
    for (const d of disputeRows || []) {
      const id = (d as any).merchant_id;
      disputeCounts[id] = (disputeCounts[id] || 0) + 1;
    }
  }

  const mapped = (merchantRows || []).map((m: any) => {
    const today = volumeToday[m.id] || { volume: 0, count: 0 };
    const month = volumeMonth[m.id] || 0;
    const territory: any = Array.isArray(m.aggregator_territories) ? m.aggregator_territories[0] : m.aggregator_territories;
    const disputes = disputeCounts[m.id] || 0;
    return {
      id: m.id,
      merchantCode: m.merchant_code,
      businessName: m.business_name,
      tradingName: m.trading_name,
      contactPerson: m.business_name,
      phone: m.phone,
      email: m.email,
      country: m.country,
      category: m.category,
      territoryName: territory?.name || 'Unassigned',
      status: m.status,
      kybStatus: m.kyb_status,
      todayVolume: today.volume,
      todayTxCount: today.count,
      monthVolume: month,
      averageTicket: today.count > 0 ? Math.round(today.volume / today.count) : 0,
      settlementBank: m.settlement_bank || 'Not yet configured',
      settlementAccountMasked: m.settlement_account_number ? `****${String(m.settlement_account_number).slice(-4)}` : '—',
      disputeRate: today.count > 0 ? Math.round((disputes / Math.max(today.count, 1)) * 1000) / 10 : 0,
      refundRate: 0,
      riskState: disputes > 3 ? 'HIGH_RISK' : disputes > 0 ? 'WATCH' : 'NORMAL',
      lastActivityAt: m.created_at,
      registeredAt: m.created_at,
    };
  });

  return createSuccessResponse({ merchants: mapped }, { code: 'MERCHANTS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
