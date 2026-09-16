import { createHash } from 'crypto';
import { RequestContext } from '@/types/apiGateway';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimiter';

export interface AuthValidationResult {
  isAuthenticated: boolean;
  context?: RequestContext;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
}

/**
 * Validates incoming public-developer-API requests against KoriePay's real
 * API key vault (public.merchant_api_keys / public.aggregator_api_keys).
 *
 * This replaces a prior implementation that never queried the database at
 * all: it accepted any bearer token that merely *looked* like a key
 * (a kp_live_/kp_test_/pk_live_/pk_test_ prefix, or just length >= 16) and
 * unconditionally granted a hardcoded full-scope ORGANIZATION_ADMIN context
 * for a fixed org/user id — meaning any caller presenting an arbitrary
 * string was authenticated as a real, specific tenant. That was live-tested
 * and confirmed to leak real customer PII through a route gated by this
 * function (see /api/beneficiaries, since removed as an orphaned mock
 * route — this file's sole remaining caller is
 * /api/v1/wallets/[id]/balance, which reads real database rows).
 *
 * The public key (`pk_live_...` / `pk_test_...`) identifies which vault row
 * to check; the secret half of the bearer token is SHA-256 hashed and
 * compared against the stored `secret_key_hash` — the same one-way hash
 * scheme already used by the real key-issuance endpoints
 * (POST /api/v1/merchant/keys, POST /api/v1/aggregator/keys). No plaintext
 * secret is ever stored, and a non-matching hash is rejected outright.
 */
export async function authenticateApiRequest(
  request: Request,
  requiredScopes: string[] = []
): Promise<AuthValidationResult> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const requestId = request.headers.get('x-request-id') || `KP-REQ-${Date.now().toString(16)}-${Math.random().toString(36).substring(2, 6)}`;
  const correlationId = request.headers.get('x-correlation-id') || requestId;
  const idempotencyKey = request.headers.get('idempotency-key') || request.headers.get('Idempotency-Key') || undefined;
  const ipAddress = getClientIp(request);

  // Bound brute-force / credential-stuffing attempts against the key vault
  // per source IP, independent of which key is being guessed.
  const rate = checkRateLimit(`api-key-auth:${ipAddress}`, 'AUTH');
  if (!rate.allowed) {
    return {
      isAuthenticated: false,
      errorCode: 'RATE_LIMITED',
      errorMessage: 'Too many authentication attempts. Please slow down and retry shortly.',
      httpStatus: 429,
    };
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      isAuthenticated: false,
      errorCode: 'UNAUTHORIZED_MISSING_TOKEN',
      errorMessage: 'Missing or malformed Authorization header. Please provide a valid Bearer token (kp_live_... or kp_test_...).',
      httpStatus: 401,
    };
  }

  const token = authHeader.replace('Bearer ', '').trim();

  // Full API tokens are issued as `${prefix}${secret}` where prefix is one
  // of kp_live_/kp_test_ (this matches what POST /api/v1/merchant/keys and
  // POST /api/v1/aggregator/keys actually hand back at creation time).
  const prefixMatch = token.match(/^(kp_live_|kp_test_)(.+)$/);
  if (!prefixMatch) {
    return {
      isAuthenticated: false,
      errorCode: 'INVALID_API_KEY',
      errorMessage: 'The provided API key is invalid or unrecognized.',
      httpStatus: 401,
    };
  }

  const environment: 'PRODUCTION' | 'SANDBOX' = prefixMatch[1] === 'kp_live_' ? 'PRODUCTION' : 'SANDBOX';
  const secret = prefixMatch[2];
  if (!secret || secret.length < 16) {
    return {
      isAuthenticated: false,
      errorCode: 'INVALID_API_KEY',
      errorMessage: 'The provided API key is invalid or unrecognized.',
      httpStatus: 401,
    };
  }
  const secretHash = createHash('sha256').update(secret).digest('hex');

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return {
      isAuthenticated: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      errorMessage: 'The API key vault is not configured.',
      httpStatus: 503,
    };
  }

  // A given hash can only ever belong to one of the two vaults (merchant or
  // aggregator) — check both, since this route is shared infrastructure and
  // does not know in advance which tenant type issued the key.
  const [merchantRow, aggregatorRow] = await Promise.all([
    admin
      .from('merchant_api_keys')
      .select('id, merchant_id, environment, status, merchant_profiles(org_id, status)')
      .eq('secret_key_hash', secretHash)
      .eq('environment', environment)
      .maybeSingle(),
    admin
      .from('aggregator_api_keys')
      .select('id, aggregator_id, environment, status, aggregators(org_id, status)')
      .eq('secret_key_hash', secretHash)
      .eq('environment', environment)
      .maybeSingle(),
  ]);

  // Every issued merchant/aggregator API key currently holds this exact
  // fixed scope set — there is no `scopes` column on merchant_api_keys /
  // aggregator_api_keys, and neither POST /api/v1/merchant/keys nor
  // POST /api/v1/aggregator/keys (nor any UI in front of them) offers a
  // scope-selection step at key creation. That is a deliberate "all keys
  // are full-scope" design for the current API surface, not an
  // enforcement bug: the `requiredScopes` loop below is real code and
  // will correctly reject a request if a scope it needs is ever absent
  // from this list, but today it can never actually fire, because every
  // key already has every scope in it. Per-key scope restriction would
  // need a schema change (a `scopes` column) plus a UI to set it at
  // issuance — flagged as a product/security enhancement for later, not
  // fixed here, since the real, load-bearing tenant-isolation boundary
  // for this route (a caller can only ever read its own org's data) is
  // enforced independently at the query level in the route handler
  // itself (see /api/v1/wallets/[id]/balance's `org_id` filter), so this
  // is a completeness gap rather than a live cross-tenant/privilege-
  // escalation vulnerability.
  const grantedScopes = [
    'payments:read',
    'payments:write',
    'transfers:write',
    'wallets:read',
    'wallets:write',
    'kyc:verify',
    'agency:write',
    'checkout:create',
    'bills:vend',
    'fx:read',
    'fx:quote',
  ];

  let context: RequestContext | null = null;

  if (merchantRow.data && !merchantRow.error) {
    const key = merchantRow.data as any;
    if (key.status !== 'ACTIVE') {
      return {
        isAuthenticated: false,
        errorCode: 'API_KEY_REVOKED',
        errorMessage: 'This API key has been revoked.',
        httpStatus: 401,
      };
    }
    const profile = Array.isArray(key.merchant_profiles) ? key.merchant_profiles[0] : key.merchant_profiles;
    context = {
      requestId,
      correlationId,
      environment,
      orgId: profile?.org_id || '',
      userId: key.merchant_id,
      userRole: 'MERCHANT',
      scopes: grantedScopes,
      apiKeyId: key.id,
      ipAddress,
      idempotencyKey,
      startTime: Date.now(),
    };
  } else if (aggregatorRow.data && !aggregatorRow.error) {
    const key = aggregatorRow.data as any;
    if (key.status !== 'ACTIVE') {
      return {
        isAuthenticated: false,
        errorCode: 'API_KEY_REVOKED',
        errorMessage: 'This API key has been revoked.',
        httpStatus: 401,
      };
    }
    const aggregator = Array.isArray(key.aggregators) ? key.aggregators[0] : key.aggregators;
    context = {
      requestId,
      correlationId,
      environment,
      orgId: aggregator?.org_id || '',
      userId: key.aggregator_id,
      userRole: 'AGGREGATOR',
      scopes: grantedScopes,
      apiKeyId: key.id,
      ipAddress,
      idempotencyKey,
      startTime: Date.now(),
    };
  }

  if (!context) {
    return {
      isAuthenticated: false,
      errorCode: 'INVALID_API_KEY',
      errorMessage: 'The provided API key is invalid or unrecognized.',
      httpStatus: 401,
    };
  }

  for (const requiredScope of requiredScopes) {
    if (!context.scopes.includes(requiredScope) && !context.scopes.includes('*')) {
      return {
        isAuthenticated: false,
        errorCode: 'FORBIDDEN_INSUFFICIENT_SCOPE',
        errorMessage: `Access denied. Your API key lacks the required scope: '${requiredScope}'.`,
        httpStatus: 403,
      };
    }
  }

  return {
    isAuthenticated: true,
    context,
  };
}
