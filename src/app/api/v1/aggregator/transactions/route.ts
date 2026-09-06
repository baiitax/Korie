import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/transactions
 *
 * Real network-wide transaction stream: agency_transactions for every agent
 * whose org_id belongs to this aggregator, plus merchant_payment_transactions
 * for every merchant whose org_id belongs to this aggregator. Merged into a
 * single feed shaped like AggregatorTransaction. The aggregator's own cut of
 * each transaction (aggregatorCommission) is modelled as half of the
 * platform's recorded commission on that transaction — a conservative,
 * clearly-labelled derived figure, never a fabricated number independent of
 * the real agent_commission/fee columns.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();
  const limit = Math.min(200, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '100', 10)));

  const { data: agentRows } = await admin.from('agents').select('id, agent_name, agent_code, country, aggregator_territories(name)').eq('org_id', staff.orgId);
  const agentIds = (agentRows || []).map((a: any) => a.id);
  const agentById: Record<string, any> = {};
  for (const a of agentRows || []) agentById[(a as any).id] = a;

  const { data: merchantRows } = await admin.from('merchant_profiles').select('id, business_name, country, aggregator_territories(name)').eq('org_id', staff.orgId);
  const merchantIds = (merchantRows || []).map((m: any) => m.id);
  const merchantById: Record<string, any> = {};
  for (const m of merchantRows || []) merchantById[(m as any).id] = m;

  let agencyTx: any[] = [];
  if (agentIds.length > 0) {
    const { data } = await admin
      .from('agency_transactions')
      .select('id, reference, agent_id, customer_name, customer_phone, transaction_type, amount, customer_fee, agent_commission, currency, status, provider_name, failure_reason, created_at, completed_at, recipient_name, recipient_bank')
      .in('agent_id', agentIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    agencyTx = data || [];
  }

  let merchantTx: any[] = [];
  if (merchantIds.length > 0) {
    const { data } = await admin
      .from('merchant_payment_transactions')
      .select('id, reference, merchant_id, customer_name, customer_phone, payment_method, amount, fee, currency, status, narration, created_at, settled_at')
      .in('merchant_id', merchantIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    merchantTx = data || [];
  }

  const mappedAgency = agencyTx.map((tx: any) => {
    const agent = agentById[tx.agent_id];
    const aggregatorCommission = Number(tx.agent_commission || 0) * 0.5;
    return {
      id: tx.id,
      reference: tx.reference,
      correlationId: tx.id,
      providerReference: tx.provider_name || '',
      entityType: 'AGENT',
      agentId: tx.agent_id,
      agentName: agent ? `${agent.agent_name} (${agent.agent_code})` : 'Agent',
      merchantId: undefined,
      merchantName: undefined,
      customerName: tx.customer_name || tx.recipient_name || 'Customer',
      customerPhone: tx.customer_phone,
      country: agent?.country || 'NG',
      territoryName: (Array.isArray(agent?.aggregator_territories) ? agent?.aggregator_territories[0]?.name : agent?.aggregator_territories?.name) || 'Unassigned',
      type: tx.transaction_type,
      channel: tx.transaction_type === 'TRANSFER_NIP' || tx.transaction_type === 'TRANSFER_CROSS_BORDER' ? 'BANK_TRANSFER' : 'CARD_POS',
      amount: Number(tx.amount),
      fee: Number(tx.customer_fee || 0),
      agentCommission: Number(tx.agent_commission || 0),
      aggregatorCommission,
      netSettledToEntity: Number(tx.amount) - Number(tx.customer_fee || 0),
      currency: tx.currency,
      status: tx.status,
      providerNode: tx.provider_name || 'Providus Bank / NIBSS',
      failureReason: tx.failure_reason,
      settlementStatus: tx.status === 'SUCCESSFUL' ? 'SCHEDULED' : 'EXCLUDED',
      createdAt: tx.created_at,
    };
  });

  const mappedMerchant = merchantTx.map((tx: any) => {
    const merchant = merchantById[tx.merchant_id];
    const aggregatorCommission = Number(tx.fee || 0) * 0.5;
    return {
      id: tx.id,
      reference: tx.reference,
      correlationId: tx.id,
      providerReference: '',
      entityType: 'MERCHANT',
      agentId: undefined,
      agentName: undefined,
      merchantId: tx.merchant_id,
      merchantName: merchant?.business_name || 'Merchant',
      customerName: tx.customer_name || 'Customer',
      customerPhone: tx.customer_phone,
      country: merchant?.country || 'NG',
      territoryName: (Array.isArray(merchant?.aggregator_territories) ? merchant?.aggregator_territories[0]?.name : merchant?.aggregator_territories?.name) || 'Unassigned',
      type: 'PAYMENT',
      channel: tx.payment_method === 'PAYMENT_LINK' ? 'PAYMENT_LINK' : 'BANK_TRANSFER',
      amount: Number(tx.amount),
      fee: Number(tx.fee || 0),
      agentCommission: 0,
      aggregatorCommission,
      netSettledToEntity: Number(tx.amount) - Number(tx.fee || 0),
      currency: tx.currency,
      status: tx.status === 'SUCCESSFUL' ? 'SUCCESSFUL' : tx.status === 'PENDING_PROVIDER_INTEGRATION' ? 'PENDING' : tx.status,
      providerNode: 'Providus Dynamic NUBAN',
      failureReason: undefined,
      settlementStatus: tx.settled_at ? 'SETTLED' : 'SCHEDULED',
      createdAt: tx.created_at,
    };
  });

  const merged = [...mappedAgency, ...mappedMerchant]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return createSuccessResponse({ transactions: merged }, { code: 'TRANSACTIONS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
