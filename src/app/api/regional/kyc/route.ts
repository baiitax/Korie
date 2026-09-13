import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, maskName } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/kyc — regional verification MONITORING, read-only.
 * Workflow status only: no identity documents, no storage paths, no
 * overrides. Sensitive decisions follow the existing maker-checker flow
 * in the compliance portal — a regional manager cannot touch them.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.kyc.view');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();

  const scope = await resolveTerritoryScope(manager);

  /* Agent verification states (territory). */
  const agentKycStatus: Record<string, number> = {};
  if (scope.agentIds.length > 0) {
    const { data } = await admin.from('agents').select('kyc_status').in('id', scope.agentIds);
    (data ?? []).forEach((a: any) => {
      agentKycStatus[a.kyc_status] = (agentKycStatus[a.kyc_status] || 0) + 1;
    });
  }

  /* Pending agent KYC documents (metadata only — never storage paths). */
  const pendingDocs: { agentCode: string; agentName: string; documentType: string; status: string; uploadedAt: string }[] = [];
  if (scope.agentIds.length > 0) {
    const { data } = await admin
      .from('agent_kyc_documents')
      .select('agent_id, document_type, status, uploaded_at')
      .in('agent_id', scope.agentIds)
      .neq('status', 'APPROVED')
      .order('uploaded_at', { ascending: false })
      .limit(100);
    const agentMeta = new Map(scope.agents.map((a) => [a.id, a]));
    (data ?? []).forEach((d: any) => {
      const agent = agentMeta.get(d.agent_id);
      pendingDocs.push({
        agentCode: agent?.agent_code ?? '—',
        agentName: maskName(agent?.agent_name),
        documentType: d.document_type,
        status: d.status,
        uploadedAt: d.uploaded_at,
      });
    });
  }

  /* Customer verification states (country-scoped). */
  const { data: verRows } = await admin
    .from('customer_verification_status')
    .select('verification_status')
    .limit(20000);
  const customerVerification: Record<string, number> = {};
  (verRows ?? []).forEach((v: any) => {
    customerVerification[v.verification_status] = (customerVerification[v.verification_status] || 0) + 1;
  });

  /* Aggregator KYB states (territory). */
  const kyb: Record<string, number> = {};
  if (scope.aggregatorIds.length > 0) {
    const { data } = await admin.from('aggregators').select('kyb_status').in('id', scope.aggregatorIds);
    (data ?? []).forEach((a: any) => {
      kyb[a.kyb_status] = (kyb[a.kyb_status] || 0) + 1;
    });
  }

  return createSuccessResponse(
    {
      agentKycStatus,
      agentKycDocs: { pending: pendingDocs.length, list: pendingDocs },
      customerVerification,
      aggregatorKyb: kyb,
      readOnly: true,
      note: 'Read-only monitoring. Identity documents are held by the compliance function; overrides follow the maker-checker flow there.',
    },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
