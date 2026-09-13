// =============================================================================
// Bank API bearer guard: verifies against the credential registry
// (DeveloperWorkspaceEngine). R-01 batch-2 remediation — the old guard
// accepted ANY kp_test_/kp_live_-prefixed string plus a KORIE_BANK_DEMO_KEY
// backdoor; both are gone. GET handlers pass 'read' (requires `bank:read`),
// mutations pass 'write' (requires `bank:write`). Unknown, revoked, expired
// and under-scoped keys fail closed with distinct codes.
//
// Keeps the historical `NextResponse | null` denied-pattern so route call
// sites stay one-liners: `const denied = await bankApiGuard(req, 'read')`.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { DeveloperWorkspaceEngine } from '@/lib/developer/DeveloperWorkspaceEngine';

export async function bankApiGuard(
  req: NextRequest,
  kind: 'read' | 'write',
): Promise<NextResponse | null> {
  const header = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED_MISSING_TOKEN',
          message: 'Missing or malformed Authorization header. Provide a valid Bank API bearer.',
        },
      },
      { status: 401 },
    );
  }

  let verification: ReturnType<DeveloperWorkspaceEngine['verifySecret']>;
  try {
    verification = DeveloperWorkspaceEngine.getInstance().verifySecret(token);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTH_REGISTRY_UNAVAILABLE',
          message: 'Credential verification is unavailable; failing closed.',
        },
      },
      { status: 503 },
    );
  }

  if (!verification.ok) {
    const messages: Record<string, string> = {
      INVALID_API_KEY: 'The provided Bank API key is invalid or unrecognized.',
      KEY_REVOKED: 'This Bank API key has been revoked.',
      KEY_EXPIRED: 'This Bank API key has expired.',
      KEY_GRACE_LAPSED: 'This rotated Bank API key is past its grace window; use the replacement.',
    };
    return NextResponse.json(
      { success: false, error: { code: verification.code, message: messages[verification.code] } },
      { status: 401 },
    );
  }

  const required = kind === 'read' ? 'bank:read' : 'bank:write';
  if (!DeveloperWorkspaceEngine.scopeSatisfies(verification.credential.scopes || [], required)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN_INSUFFICIENT_SCOPE',
          message: `Access denied. Your Bank API key lacks the required scope: '${required}'.`,
        },
      },
      { status: 403 },
    );
  }

  return null;
}
