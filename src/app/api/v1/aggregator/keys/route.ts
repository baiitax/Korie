import { NextRequest } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/keys — real API keys (secret shown only once at
 * creation; stored as a SHA-256 hash thereafter). Mirrors
 * /api/v1/merchant/keys exactly.
 *
 * POST /api/v1/aggregator/keys — issues a new key. PRODUCTION keys require
 * the aggregator org to be ACTIVE (KYB verified).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('aggregator_api_keys')
    .select('id, key_name, public_key, secret_key_last4, environment, status, last_used_at, created_at')
    .eq('aggregator_id', staff.aggregatorId)
    .order('created_at', { ascending: false });

  if (error) {
    return createErrorResponse({ code: 'API_KEYS_LOOKUP_FAILED', message: 'Could not load API keys.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((k: any) => ({
    id: k.id,
    keyName: k.key_name,
    publicKey: k.public_key,
    secretKeyMasked: `${k.environment === 'PRODUCTION' ? 'kp_live_' : 'kp_test_'}••••••••${k.secret_key_last4}`,
    environment: k.environment,
    status: k.status,
    lastUsedAt: k.last_used_at,
    createdAt: k.created_at,
  }));

  return createSuccessResponse({ apiKeys: mapped }, { code: 'API_KEYS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
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

  const environment = body.environment === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX';
  const keyName = body.keyName || (environment === 'PRODUCTION' ? 'Live Secret Key' : 'Sandbox Secret Key');

  if (environment === 'PRODUCTION' && staff.aggregatorStatus !== 'ACTIVE') {
    return createErrorResponse({
      code: 'AGGREGATOR_NOT_ACTIVE',
      message: 'Live API keys unlock once your aggregator account passes KYB review. You can build and test with a sandbox key today.',
      requestId: staff.requestId,
      httpStatus: 403,
    });
  }

  const admin = getSupabaseAdminClient();
  const rawSecret = randomBytes(24).toString('hex');
  const secretHash = createHash('sha256').update(rawSecret).digest('hex');
  const publicKey = `${environment === 'PRODUCTION' ? 'pk_live_' : 'pk_test_'}${randomBytes(12).toString('hex')}`;
  const fullSecret = `${environment === 'PRODUCTION' ? 'kp_live_' : 'kp_test_'}${rawSecret}`;

  const { data: keyRow, error } = await admin
    .from('aggregator_api_keys')
    .insert({
      aggregator_id: staff.aggregatorId,
      key_name: keyName,
      public_key: publicKey,
      secret_key_hash: secretHash,
      secret_key_last4: rawSecret.slice(-4),
      environment,
      created_by: staff.staffId,
    })
    .select('id, key_name, public_key, environment, status, created_at')
    .single();

  if (error || !keyRow) {
    return createErrorResponse({ code: 'API_KEY_CREATE_FAILED', message: 'Could not create API key.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    {
      id: keyRow.id,
      keyName: keyRow.key_name,
      publicKey: keyRow.public_key,
      secretKey: fullSecret,
      environment: keyRow.environment,
      status: keyRow.status,
      createdAt: keyRow.created_at,
    },
    { code: 'API_KEY_CREATED', message: 'Store this secret key now — it will not be shown again.', requestId: staff.requestId, environment: 'PRODUCTION', status: 201 },
  );
}
