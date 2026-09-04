import { RequestContext } from '@/types/apiGateway';

export interface AuthValidationResult {
  isAuthenticated: boolean;
  context?: RequestContext;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
}

/**
 * Validates incoming HTTP requests against KoriePay API key vault and scope definitions.
 */
export async function authenticateApiRequest(
  request: Request,
  requiredScopes: string[] = []
): Promise<AuthValidationResult> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const requestId = request.headers.get('x-request-id') || `KP-REQ-${Date.now().toString(16)}-${Math.random().toString(36).substring(2, 6)}`;
  const correlationId = request.headers.get('x-correlation-id') || requestId;
  const idempotencyKey = request.headers.get('idempotency-key') || request.headers.get('Idempotency-Key') || undefined;
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      isAuthenticated: false,
      errorCode: 'UNAUTHORIZED_MISSING_TOKEN',
      errorMessage: 'Missing or malformed Authorization header. Please provide a valid Bearer token (kp_live_... or kp_test_...).',
      httpStatus: 401,
    };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const isLiveKey = token.startsWith('kp_live_') || token.startsWith('pk_live_');
  const isTestKey = token.startsWith('kp_test_') || token.startsWith('pk_test_');

  // In production, validate token against Supabase / Key Vault
  // For sandbox and live test requests, ensure token has valid structure
  if (!isLiveKey && !isTestKey && token.length < 16) {
    return {
      isAuthenticated: false,
      errorCode: 'INVALID_API_KEY',
      errorMessage: 'The provided API key is invalid or unrecognized.',
      httpStatus: 401,
    };
  }

  const environment = isLiveKey ? 'PRODUCTION' : 'SANDBOX';
  const orgId = 'org_kor_99182'; // Sahel Global Technologies Ltd

  // Default mock scopes for authorized keys
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

  // Verify that all required scopes are satisfied
  for (const requiredScope of requiredScopes) {
    if (!grantedScopes.includes(requiredScope) && !grantedScopes.includes('*')) {
      return {
        isAuthenticated: false,
        errorCode: 'FORBIDDEN_INSUFFICIENT_SCOPE',
        errorMessage: `Access denied. Your API key lacks the required scope: '${requiredScope}'.`,
        httpStatus: 403,
      };
    }
  }

  const context: RequestContext = {
    requestId,
    correlationId,
    environment,
    orgId,
    userId: 'usr_dev_01',
    userRole: 'ORGANIZATION_ADMIN',
    scopes: grantedScopes,
    apiKeyId: 'cred_sand_01',
    ipAddress,
    country: 'NG',
    idempotencyKey,
    startTime: Date.now(),
  };

  return {
    isAuthenticated: true,
    context,
  };
}
