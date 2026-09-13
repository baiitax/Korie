import { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/security/authMiddleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ['kyc:verify']);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || 'UNAUTHORIZED',
      message: auth.errorMessage || 'Unauthorized',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { context } = auth;
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return createErrorResponse({
      code: 'INVALID_JSON',
      message: 'Invalid JSON body.',
      requestId: context.requestId,
      httpStatus: 400,
    });
  }

  const { country, id_type, id_number } = body;

  if (!id_number || typeof id_number !== 'string' || !id_number.trim()) {
    return createErrorResponse({
      code: 'VALIDATION_ERROR',
      message: 'id_number is required.',
      requestId: context.requestId,
      httpStatus: 400,
    });
  }

  // HONEST DEFAULT (R-01 ride-along): this route used to answer EXACT_MATCH /
  // 99.4 for every request without consulting anything — a fake verification.
  // No verification provider is integrated, so the only truthful answer is a
  // negative: NOT_VERIFIED with the reason stated. Downstream money paths
  // must treat this as "identity unproven", never as a pass.
  const provider = (process.env.KORIE_KYC_PROVIDER || '').trim();
  if (provider) {
    return createErrorResponse({
      code: 'PROVIDER_NOT_IMPLEMENTED',
      message: `KYC provider '${provider}' is configured but has no integration yet; refusing to fabricate a result.`,
      requestId: context.requestId,
      httpStatus: 501,
    });
  }

  const idStr = id_number.trim();
  return createSuccessResponse({
    verification_id: `KYC-VER-${Date.now()}`,
    country: country || 'NG',
    id_type: id_type || 'BVN',
    id_number_masked: `${idStr.slice(0, 3)}•••••${idStr.slice(-3)}`,
    match_status: 'NOT_VERIFIED',
    reason: 'NO_VERIFICATION_PROVIDER',
    confidence_score: null,
    name_match: null,
    sanctions_pep_clean: null,
    checked_at: new Date().toISOString(),
  }, {
    code: 'IDENTITY_NOT_VERIFIED',
    message: 'No identity verification provider is configured; this sandbox cannot verify identities.',
    requestId: context.requestId,
    correlationId: context.correlationId,
    environment: context.environment,
  });
}
