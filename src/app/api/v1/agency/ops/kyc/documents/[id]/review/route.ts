import { NextRequest } from 'next/server';
import { authorizeOpsRequest } from '@/lib/security/opsAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/agency/ops/kyc/documents/:id/review
 *
 * Human admin (AGENCY_OPS_ADMIN / SUPER_ADMIN) approves or rejects a
 * previously uploaded KYC document. This is the entire "verification" for
 * this iteration — a real person reviews a real uploaded file and the
 * decision is permanently recorded (reviewed_by/reviewed_at), never an
 * automated pass/fail.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorizeOpsRequest(req, ['SUPER_ADMIN', 'AGENCY_OPS_ADMIN']);
  if (!auth.isAuthorized) {
    return createErrorResponse({ code: auth.errorCode || 'FORBIDDEN', message: auth.errorMessage || 'Not authorized.', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const { decision, rejection_reason } = body;
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return createErrorResponse({ code: 'INVALID_DECISION', message: 'decision must be APPROVED or REJECTED.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }
  if (decision === 'REJECTED' && !rejection_reason) {
    return createErrorResponse({ code: 'MISSING_REJECTION_REASON', message: 'A rejection reason is required.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data: docRow, error: fetchError } = await admin
    .from('agent_kyc_documents')
    .select('id, agent_id, status')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchError || !docRow) {
    return createErrorResponse({ code: 'DOCUMENT_NOT_FOUND', message: 'KYC document not found.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 404 });
  }

  const { data: updated, error: updateError } = await admin
    .from('agent_kyc_documents')
    .update({
      status: decision,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: decision === 'REJECTED' ? rejection_reason : null,
    })
    .eq('id', params.id)
    .select()
    .single();

  if (updateError) {
    return createErrorResponse({ code: 'REVIEW_UPDATE_FAILED', message: 'Could not record review decision.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 500 });
  }

  await admin.from('agent_audit_logs').insert({
    agent_id: docRow.agent_id,
    action: `KYC_DOCUMENT_${decision}`,
    target_type: 'agent_kyc_documents',
    target_id: params.id,
    result: 'SUCCESS',
    reason: decision === 'REJECTED' ? rejection_reason : 'Document approved by ops reviewer.',
  });

  // If every required document type for this agent is now APPROVED, mark
  // the agent's overall KYC status VERIFIED. This is a real aggregate check
  // against the documents table, not a status flip driven by a single click.
  const REQUIRED_TYPES = ['NATIONAL_ID', 'PROOF_OF_ADDRESS'];
  const { data: agentDocs } = await admin
    .from('agent_kyc_documents')
    .select('document_type, status')
    .eq('agent_id', docRow.agent_id)
    .in('document_type', REQUIRED_TYPES);

  const allApproved = REQUIRED_TYPES.every((t) => (agentDocs || []).some((d: any) => d.document_type === t && d.status === 'APPROVED'));

  if (allApproved) {
    await admin.from('agents').update({ kyc_status: 'VERIFIED' }).eq('id', docRow.agent_id);
  } else if (decision === 'REJECTED') {
    await admin.from('agents').update({ kyc_status: 'REJECTED' }).eq('id', docRow.agent_id);
  }

  return createSuccessResponse(
    { id: updated.id, status: updated.status, reviewed_at: updated.reviewed_at, agent_kyc_verified: allApproved },
    { code: 'KYC_DOCUMENT_REVIEWED', requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' }
  );
}
