import { NextRequest, NextResponse } from 'next/server';
import { developerApiGuard } from '@/lib/security/apiGuards';

export const dynamic = 'force-dynamic';

/**
 * GET /api/developers/session — whoami for the developer console gate.
 * Verifies the presented console key and returns the identity the server
 * derived from the credential registry (never client-supplied).
 */
export async function GET(req: NextRequest) {
  const guard = await developerApiGuard(req, 'read');
  if (!guard.ok) return guard.response;
  const c = guard.context;
  return NextResponse.json({
    success: true,
    data: {
      credentialId: c.apiKeyId,
      ownerUserId: c.userId,
      operatorRole: c.userRole,
      scopes: c.scopes,
      environment: c.environment,
      orgId: c.orgId,
    },
  });
}
