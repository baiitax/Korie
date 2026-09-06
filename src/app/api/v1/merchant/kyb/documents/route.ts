import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOC_TYPES = [
  'CAC_CERTIFICATE', 'TIN_CERTIFICATE', 'MEMART', 'PROOF_OF_ADDRESS',
  'DIRECTOR_ID', 'BANK_STATEMENT', 'UTILITY_BILL', 'OTHER',
];

/**
 * GET/POST /api/v1/merchant/kyb/documents — same manual-review pattern as
 * the agency banking KYC document flow: uploads land in the private
 * `merchant-kyb-documents` bucket as PENDING rows for human ops review; no
 * auto-verification. This is how a PENDING, self-registered merchant
 * completes KYB while waiting for activation.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_kyb_documents')
    .select('id, document_type, original_filename, status, rejection_reason, uploaded_at, reviewed_at')
    .eq('merchant_id', staff.merchantId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    return createErrorResponse({ code: 'KYB_DOCS_LOOKUP_FAILED', message: 'Could not load KYB documents.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse({ documents: data || [] }, { code: 'KYB_DOCS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: staff.requestId, httpStatus: 400 });
  }

  const { document_type, filename, mime_type, base64_data } = body;

  if (!ALLOWED_DOC_TYPES.includes(document_type)) {
    return createErrorResponse({ code: 'INVALID_DOCUMENT_TYPE', message: 'Unsupported document type.', requestId: staff.requestId, httpStatus: 400 });
  }
  if (!ALLOWED_MIME.includes(mime_type)) {
    return createErrorResponse({ code: 'INVALID_FILE_TYPE', message: 'Only JPEG, PNG, or PDF files are accepted.', requestId: staff.requestId, httpStatus: 400 });
  }
  if (!base64_data) {
    return createErrorResponse({ code: 'MISSING_FILE_DATA', message: 'No file data provided.', requestId: staff.requestId, httpStatus: 400 });
  }

  const buffer = Buffer.from(base64_data, 'base64');
  if (buffer.byteLength > MAX_BYTES) {
    return createErrorResponse({ code: 'FILE_TOO_LARGE', message: 'File exceeds the 10MB limit.', requestId: staff.requestId, httpStatus: 413 });
  }

  const admin = getSupabaseAdminClient();
  const ext = mime_type === 'application/pdf' ? 'pdf' : mime_type === 'image/png' ? 'png' : 'jpg';
  const storagePath = `${staff.merchantId}/${document_type.toLowerCase()}-${randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from('merchant-kyb-documents')
    .upload(storagePath, buffer, { contentType: mime_type, upsert: false });

  if (uploadError) {
    return createErrorResponse({ code: 'UPLOAD_FAILED', message: 'Could not upload document. Please try again.', requestId: staff.requestId, httpStatus: 500 });
  }

  const { data: docRow, error: dbError } = await admin
    .from('merchant_kyb_documents')
    .insert({
      merchant_id: staff.merchantId,
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
    await admin.storage.from('merchant-kyb-documents').remove([storagePath]);
    return createErrorResponse({ code: 'KYB_DOC_RECORD_FAILED', message: 'Could not record document upload.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    {
      id: docRow.id,
      document_type: docRow.document_type,
      status: docRow.status,
      uploaded_at: docRow.uploaded_at,
    },
    { code: 'KYB_DOC_UPLOADED', message: 'Document submitted for review.', requestId: staff.requestId, environment: 'PRODUCTION' }
  );
}
