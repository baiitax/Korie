import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/settlements — real public.settlement_batches rows
 * for this aggregator's own org (settlement_batches is already org-scoped,
 * reused as-is from the agency-banking settlement engine).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: agg } = await admin.from('aggregators').select('settlement_bank, settlement_account_number').eq('id', staff.aggregatorId).single();

  const { data: batches, error } = await admin
    .from('settlement_batches')
    .select('id, batch_reference, currency, settlement_date, status, total_commission_amount, total_agent_count, created_at, posted_at, paid_at')
    .eq('org_id', staff.orgId)
    .order('settlement_date', { ascending: false })
    .limit(60);

  if (error) {
    return createErrorResponse({ code: 'SETTLEMENTS_LOOKUP_FAILED', message: 'Could not load settlements.', requestId: staff.requestId, httpStatus: 500 });
  }

  const batchIds = (batches || []).map((b: any) => b.id);

  // Real per-batch gross volume / interchange fees / reversals: each
  // settlement_batch_lines row names the exact agents whose commissions
  // were rolled into a batch on that settlement_date. Sum the underlying
  // agency_transactions for those same agents on that same date to derive
  // the real gross volume, fees, and reversed amounts a batch represents —
  // never a hardcoded zero.
  let agentsByBatch: Record<string, string[]> = {};
  if (batchIds.length > 0) {
    const { data: lines } = await admin
      .from('settlement_batch_lines')
      .select('settlement_batch_id, agent_id')
      .in('settlement_batch_id', batchIds);
    for (const l of lines || []) {
      const bid = (l as any).settlement_batch_id;
      (agentsByBatch[bid] ||= []).push((l as any).agent_id);
    }
  }

  const grossByBatch: Record<string, number> = {};
  const feesByBatch: Record<string, number> = {};
  const refundsByBatch: Record<string, number> = {};

  await Promise.all(
    (batches || []).map(async (b: any) => {
      const agentIds = agentsByBatch[b.id] || [];
      if (agentIds.length === 0) return;
      const dayStart = `${b.settlement_date}T00:00:00.000Z`;
      const dayEnd = `${b.settlement_date}T23:59:59.999Z`;
      const { data: txRows } = await admin
        .from('agency_transactions')
        .select('agent_id, amount, customer_fee, status')
        .in('agent_id', agentIds)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);
      let gross = 0;
      let fees = 0;
      let refunds = 0;
      for (const t of txRows || []) {
        if ((t as any).status === 'SUCCESSFUL') {
          gross += Number((t as any).amount);
          fees += Number((t as any).customer_fee || 0);
        } else if ((t as any).status === 'REVERSED') {
          refunds += Number((t as any).amount);
        }
      }
      grossByBatch[b.id] = gross;
      feesByBatch[b.id] = fees;
      refundsByBatch[b.id] = refunds;
    }),
  );

  const mapped = (batches || []).map((b: any) => ({
    id: b.id,
    batchReference: b.batch_reference,
    providerRef: b.batch_reference,
    settlementDate: b.settlement_date,
    grossNetworkVolume: grossByBatch[b.id] || 0,
    totalInterchangeFees: feesByBatch[b.id] || 0,
    refundsAdjusted: refundsByBatch[b.id] || 0,
    netAggregatorCommissionSettled: Number(b.total_commission_amount) * 0.5,
    currency: b.currency,
    destinationBank: agg?.settlement_bank || 'Not yet configured',
    destinationAccountMasked: agg?.settlement_account_number ? `****${String(agg.settlement_account_number).slice(-4)}` : '—',
    status: b.status === 'OPEN' ? 'SCHEDULED' : b.status === 'POSTED' ? 'PROCESSING' : b.status === 'PAID' ? 'COMPLETED' : 'FAILED',
    includedTransactionsCount: b.total_agent_count,
    settledAt: b.paid_at || b.posted_at,
  }));

  return createSuccessResponse({ settlements: mapped }, { code: 'SETTLEMENTS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
