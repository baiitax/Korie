import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOC_TYPES = [
  'NATIONAL_ID', 'BVN_SLIP', 'CAC_CERTIFICATE', 'PROOF_OF_ADDRESS',
  'PASSPORT_PHOTO', 'UTILITY_BILL', 'BUSINESS_PREMISES_PHOTO', 'OTHER',
];

/**
 * GET /api/v1/agency/kyc/documents — list the authenticated agent's own
 * uploaded KYC documents and their real review status.
 *
 * POST /api/v1/agency/kyc/documents — upload a document (base64 payload,
 * capped at 10MB) into the private `agent-kyc-documents` storage bucket and
 * record a PENDING row for human admin review. No auto-verification is
 * performed here — this is deliberately manual review per the agreed scope.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('agent_kyc_documents')
    .select('id, document_type, original_filename, status, rejection_reason, uploaded_at, reviewed_at')
    .eq('agent_id', agent.agentId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    return createErrorResponse({ code: 'KYC_DOCS_LOOKUP_FAILED', message: 'Could not load KYC documents.', requestId: agent.requestId, httpStatus: 500 });
  }

  return createSuccessResponse({ documents: data || [] }, { code: 'KYC_DOCS_RETRIEVED', requestId: agent.requestId, environment: 'PRODUCTION' });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: agent.requestId, httpStatus: 400 });
  }

  const { document_type, filename, mime_type, base64_data } = body;

  if (!ALLOWED_DOC_TYPES.includes(document_type)) {
    return createErrorResponse({ code: 'INVALID_DOCUMENT_TYPE', message: 'Unsupported document type.', requestId: agent.requestId, httpStatus: 400 });
  }
  if (!ALLOWED_MIME.includes(mime_type)) {
    return createErrorResponse({ code: 'INVALID_FILE_TYPE', message: 'Only JPEG, PNG, or PDF files are accepted.', requestId: agent.requestId, httpStatus: 400 });
  }
  if (!base64_data) {
    return createErrorResponse({ code: 'MISSING_FILE_DATA', message: 'No file data provided.', requestId: agent.requestId, httpStatus: 400 });
  }

  const buffer = Buffer.from(base64_data, 'base64');
  if (buffer.byteLength > MAX_BYTES) {
    return createErrorResponse({ code: 'FILE_TOO_LARGE', message: 'File exceeds the 10MB limit.', requestId: agent.requestId, httpStatus: 413 });
  }

  const admin = getSupabaseAdminClient();
  const ext = mime_type === 'application/pdf' ? 'pdf' : mime_type === 'image/png' ? 'png' : 'jpg';
  const storagePath = `${agent.agentId}/${document_type.toLowerCase()}-${randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from('agent-kyc-documents')
    .upload(storagePath, buffer, { contentType: mime_type, upsert: false });

  if (uploadError) {
    return createErrorResponse({ code: 'UPLOAD_FAILED', message: 'Could not upload document. Please try again.', requestId: agent.requestId, httpStatus: 500 });
  }

  const { data: docRow, error: dbError } = await admin
    .from('agent_kyc_documents')
    .insert({
      agent_id: agent.agentId,
      document_type,
      storage_path: storagePath,
      original_filename: filename || null,
      mime_type,
      file_size_bytes: buffer.byteLength,
      status: 'PENDING',
    })
    .select()
    .single();

  if (dbError) {
    // Roll back the uploaded object so storage never has an orphaned file
    // with no corresponding review record.
    await admin.storage.from('agent-kyc-documents').remove([storagePath]);
    return createErrorResponse({ code: 'KYC_DOC_RECORD_FAILED', message: 'Could not record document upload.', requestId: agent.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    {
      id: docRow.id,
      document_type: docRow.document_type,
      status: docRow.status,
      uploaded_at: docRow.uploaded_at,
    },
    { code: 'KYC_DOC_UPLOADED', message: 'Document submitted for review.', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}
