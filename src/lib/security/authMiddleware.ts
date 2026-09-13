import { RequestContext } from '@/types/apiGateway';
import { DeveloperWorkspaceEngine } from '@/lib/developer/DeveloperWorkspaceEngine';

export interface AuthValidationResult {
  isAuthenticated: boolean;
  context?: RequestContext;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
}

/**
 * Validates incoming HTTP requests against the credential registry
 * (DeveloperWorkspaceEngine). R-01 remediation: bearer format alone
 * authenticates nothing — the presented secret must match a stored verifier
 * for an ACTIVE (or in-grace ROTATING) credential, and scopes, environment,
 * org and owner all come from that record. Unknown, revoked, expired and
 * pre-hash legacy credentials fail closed with distinct codes.
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
      errorMessage: 'Missing or malformed Authorization header. Please provide a valid Bearer token.',
      httpStatus: 401,
    };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return {
      isAuthenticated: false,
      errorCode: 'UNAUTHORIZED_MISSING_TOKEN',
      errorMessage: 'Empty Bearer token.',
      httpStatus: 401,
    };
  }

  let verification: ReturnType<DeveloperWorkspaceEngine['verifySecret']>;
  try {
    verification = DeveloperWorkspaceEngine.getInstance().verifySecret(token);
  } catch {
    return {
      isAuthenticated: false,
      errorCode: 'AUTH_REGISTRY_UNAVAILABLE',
      errorMessage: 'Credential verification is unavailable; failing closed.',
      httpStatus: 503,
    };
  }

  if (!verification.ok) {
    const messages: Record<string, string> = {
      INVALID_API_KEY: 'The provided API key is invalid or unrecognized.',
      KEY_REVOKED: 'This API key has been revoked.',
      KEY_EXPIRED: 'This API key has expired.',
      KEY_GRACE_LAPSED: 'This rotated API key is past its grace window; use the replacement.',
    };
    return {
      isAuthenticated: false,
      errorCode: verification.code,
      errorMessage: messages[verification.code],
      httpStatus: 401,
    };
  }

  const cred = verification.credential;
  const grantedScopes = cred.scopes || [];

  // Verify that all required scopes are satisfied (exact, prefix:* or *).
  for (const requiredScope of requiredScopes) {
    if (!DeveloperWorkspaceEngine.scopeSatisfies(grantedScopes, requiredScope)) {
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
    environment: cred.environment === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX',
    orgId: cred.orgId,
    userId: cred.ownerUserId,
    userRole: cred.operatorRole,
    scopes: grantedScopes,
    apiKeyId: cred.id,
    ipAddress,
    idempotencyKey,
    startTime: Date.now(),
  };

  return {
    isAuthenticated: true,
    context,
  };
}
