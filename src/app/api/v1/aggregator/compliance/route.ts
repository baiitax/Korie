import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/compliance — real KYC/KYB document review queue:
 * agent_kyc_documents for every agent, and merchant_kyb_documents for every
 * merchant, whose org_id belongs to this aggregator. Reuses the existing
 * document tables/statuses — no separate aggregator compliance schema.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: agentRows } = await admin.from('agents').select('id, agent_name, agent_code, aggregator_territories(name)').eq('org_id', staff.orgId);
  const agentIds = (agentRows || []).map((a: any) => a.id);
  const agentById: Record<string, any> = {};
  for (const a of agentRows || []) agentById[(a as any).id] = a;

  const { data: merchantRows } = await admin.from('merchant_profiles').select('id, business_name, merchant_code, aggregator_territories(name)').eq('org_id', staff.orgId);
  const merchantIds = (merchantRows || []).map((m: any) => m.id);
  const merchantById: Record<string, any> = {};
  for (const m of merchantRows || []) merchantById[(m as any).id] = m;

  let agentDocs: any[] = [];
  if (agentIds.length > 0) {
    const { data } = await admin
      .from('agent_kyc_documents')
      .select('id, agent_id, document_type, status, rejection_reason, uploaded_at')
      .in('agent_id', agentIds)
      .order('uploaded_at', { ascending: false });
    agentDocs = data || [];
  }

  let merchantDocs: any[] = [];
  if (merchantIds.length > 0) {
    const { data } = await admin
      .from('merchant_kyb_documents')
      .select('id, merchant_id, document_type, status, rejection_reason, uploaded_at')
      .in('merchant_id', merchantIds)
      .order('uploaded_at', { ascending: false });
    merchantDocs = data || [];
  }

  const mappedAgent = agentDocs.map((d: any) => {
    const agent = agentById[d.agent_id];
    return {
      id: d.id,
      entityType: 'AGENT',
      entityId: d.agent_id,
      entityName: agent ? `${agent.agent_name} (${agent.agent_code})` : 'Agent',
      territoryName: (Array.isArray(agent?.aggregator_territories) ? agent?.aggregator_territories[0]?.name : agent?.aggregator_territories?.name) || 'Unassigned',
      documentType: d.document_type,
      submittedAt: d.uploaded_at,
      status: d.status === 'PENDING' ? 'PENDING_REVIEW' : d.status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      reviewNotes: d.rejection_reason,
    };
  });

  const mappedMerchant = merchantDocs.map((d: any) => {
    const merchant = merchantById[d.merchant_id];
    return {
      id: d.id,
      entityType: 'MERCHANT',
      entityId: d.merchant_id,
      entityName: merchant ? `${merchant.business_name} (${merchant.merchant_code})` : 'Merchant',
      territoryName: (Array.isArray(merchant?.aggregator_territories) ? merchant?.aggregator_territories[0]?.name : merchant?.aggregator_territories?.name) || 'Unassigned',
      documentType: d.document_type,
      submittedAt: d.uploaded_at,
      status: d.status === 'PENDING' ? 'PENDING_REVIEW' : d.status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      reviewNotes: d.rejection_reason,
    };
  });

  const merged = [...mappedAgent, ...mappedMerchant].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return createSuccessResponse({ complianceRecords: merged }, { code: 'COMPLIANCE_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
