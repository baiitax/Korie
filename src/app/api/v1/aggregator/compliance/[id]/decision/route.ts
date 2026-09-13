import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

const REVIEW_ROLES = ['AGGREGATOR_OWNER', 'AGGREGATOR_ADMIN', 'COMPLIANCE_OFFICER'];

/**
 * POST /api/v1/aggregator/compliance/:id/decision
 *
 * Approves or rejects a single agent_kyc_documents / merchant_kyb_documents
 * row that belongs to this aggregator's own network. This is the backing
 * endpoint the /aggregator/compliance page was missing — until now the page
 * only ever rendered the read-only queue with no way to actually decide.
 *
 * Scope enforcement: the target document's agent/merchant must resolve to
 * an org_id matching the authenticated aggregator staff's own org_id — an
 * aggregator can only approve/reject documents belonging to its own network,
 * never another aggregator's. Only OWNER/ADMIN/COMPLIANCE_OFFICER roles may
 * decide (FIELD_OFFICER, ANALYST, AUDITOR, RISK_OFFICER, FINANCE_MANAGER,
 * OPERATIONS_MANAGER cannot) — segregation of duties, not a blanket "any
 * staff member" action.
 *
 * Records an aggregator_audit_logs row for every decision (approved or
 * rejected) and, on approval, re-checks whether all required document types
 * for that agent/merchant are now APPROVED before flipping kyc_status /
 * kyb_status to VERIFIED — mirrors the real aggregate-check pattern already
 * used by the agency ops KYC review endpoint. Never a single-click status
 * flip with no evidence.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  if (!REVIEW_ROLES.includes(staff.role)) {
    return createErrorResponse({
      code: 'FORBIDDEN_ROLE',
      message: 'Your role is not authorized to decide compliance documents. Only Owner, Admin, or Compliance Officer roles may approve/reject.',
      requestId: staff.requestId,
      httpStatus: 403,
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: staff.requestId, httpStatus: 400 });
  }

  const { entityType, decision, rejectionReason } = body;
  if (!['AGENT', 'MERCHANT'].includes(entityType)) {
    return createErrorResponse({ code: 'INVALID_ENTITY_TYPE', message: 'entityType must be AGENT or MERCHANT.', requestId: staff.requestId, httpStatus: 400 });
  }
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return createErrorResponse({ code: 'INVALID_DECISION', message: 'decision must be APPROVED or REJECTED.', requestId: staff.requestId, httpStatus: 400 });
  }
  if (decision === 'REJECTED' && !rejectionReason) {
    return createErrorResponse({ code: 'MISSING_REJECTION_REASON', message: 'A rejection reason is required.', requestId: staff.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();
  const table = entityType === 'AGENT' ? 'agent_kyc_documents' : 'merchant_kyb_documents';
  const ownerCol = entityType === 'AGENT' ? 'agent_id' : 'merchant_id';
  const ownerTable = entityType === 'AGENT' ? 'agents' : 'merchant_profiles';
  const statusCol = entityType === 'AGENT' ? 'kyc_status' : 'kyb_status';

  const { data: docRow, error: fetchError } = await admin
    .from(table)
    .select(`id, ${ownerCol}, status`)
    .eq('id', params.id)
    .maybeSingle();

  if (fetchError || !docRow) {
    return createErrorResponse({ code: 'DOCUMENT_NOT_FOUND', message: 'Compliance document not found.', requestId: staff.requestId, httpStatus: 404 });
  }

  const ownerId = (docRow as any)[ownerCol];

  // Scope check: the owning agent/merchant must belong to THIS aggregator's org.
  const { data: ownerRow, error: ownerError } = await admin
    .from(ownerTable)
    .select('id, org_id')
    .eq('id', ownerId)
    .maybeSingle();

  if (ownerError || !ownerRow || (ownerRow as any).org_id !== staff.orgId) {
    return createErrorResponse({
      code: 'OUT_OF_SCOPE',
      message: 'This document does not belong to your aggregator network.',
      requestId: staff.requestId,
      httpStatus: 403,
    });
  }

  if (docRow.status !== 'PENDING') {
    return createErrorResponse({
      code: 'DOCUMENT_ALREADY_DECIDED',
      message: `This document was already ${docRow.status}.`,
      requestId: staff.requestId,
      httpStatus: 409,
    });
  }

  const { data: updated, error: updateError } = await admin
    .from(table)
    .update({
      status: decision,
      reviewed_by: staff.authUserId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: decision === 'REJECTED' ? rejectionReason : null,
    })
    .eq('id', params.id)
    .select()
    .single();

  if (updateError) {
    return createErrorResponse({ code: 'DECISION_UPDATE_FAILED', message: 'Could not record the compliance decision.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('aggregator_audit_logs').insert({
    aggregator_id: staff.aggregatorId,
    actor_staff_id: staff.staffId,
    action: `COMPLIANCE_DOCUMENT_${decision}`,
    target_type: table,
    target_id: params.id,
    result: 'SUCCESS',
    reason: decision === 'REJECTED' ? rejectionReason : `Document approved by ${staff.fullName}.`,
  });

  // Real aggregate check — only flip VERIFIED when every required document
  // type for this owner is now APPROVED. Never a single-click status flip.
  const REQUIRED_TYPES = entityType === 'AGENT'
    ? ['NATIONAL_ID', 'PROOF_OF_ADDRESS']
    : ['CAC_CERTIFICATE', 'DIRECTOR_ID'];

  const { data: allDocs } = await admin
    .from(table)
    .select('document_type, status')
    .eq(ownerCol, ownerId)
    .in('document_type', REQUIRED_TYPES);

  const allApproved = REQUIRED_TYPES.every((t) =>
    (allDocs || []).some((d: any) => d.document_type === t && d.status === 'APPROVED'),
  );

  if (allApproved) {
    await admin.from(ownerTable).update({ [statusCol]: 'VERIFIED' }).eq('id', ownerId);
  } else if (decision === 'REJECTED') {
    await admin.from(ownerTable).update({ [statusCol]: 'REJECTED' }).eq('id', ownerId);
  }

  return createSuccessResponse(
    { id: updated.id, status: updated.status, reviewedAt: updated.reviewed_at, entityVerified: allApproved },
    { code: 'COMPLIANCE_DECISION_RECORDED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
