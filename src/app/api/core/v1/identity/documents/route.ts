import { NextRequest } from 'next/server';
import { DocumentVaultEngine } from '@/lib/identity/DocumentVaultEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const identityId = url.searchParams.get('identityId');

    const documents = identityId 
      ? DocumentVaultEngine.getDocumentsForIdentity(identityId)
      : DocumentVaultEngine.getAllDocuments();

    return ApiResponse.success({
      count: documents.length,
      documents,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'DOCUMENTS_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identityId, documentType, documentNumberMasked, mimeType, fileSizeBytes, uploadedBy, expiresAt } = body;

    if (!identityId || !documentType || !mimeType || !fileSizeBytes || !uploadedBy) {
      return ApiResponse.badRequest('identityId, documentType, mimeType, fileSizeBytes, and uploadedBy are required.');
    }

    const doc = DocumentVaultEngine.registerDocument({
      identityId,
      documentType,
      documentNumberMasked,
      mimeType,
      fileSizeBytes,
      uploadedBy,
      expiresAt,
    });

    return ApiResponse.created(doc, `Document [${doc.documentType}] securely registered in vault.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'DOCUMENT_REGISTRATION_ERROR', 400);
  }
}
