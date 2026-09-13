import { NextRequest, NextResponse } from 'next/server';
import { DeveloperWorkspaceEngine, DeveloperWorkspaceEngineError } from '@/lib/developer/DeveloperWorkspaceEngine';
import { adminApiGuard } from '@/lib/security/apiGuards';

export const dynamic = 'force-dynamic';

/**
 * Operator console keys — credentials with `appId: 'operator-console'`.
 * Issued to humans/services that drive the admin console (never to third-
 * party apps). Raw secrets are returned once at issuance, exactly like app
 * keys; rows served here are masked inventory, verifiers never leave the
 * engine.
 */
export async function GET(req: NextRequest) {
  const guard = await adminApiGuard(req, 'read');
  if (!guard.ok) return guard.response;
  try {
    const engine = DeveloperWorkspaceEngine.getInstance();
    const keys = engine.listCredentials().filter(c => (c as { appId?: string }).appId === 'operator-console');
    return NextResponse.json({ success: true, data: keys });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof DeveloperWorkspaceEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof DeveloperWorkspaceEngineError ? err.httpStatus : 500;
    return NextResponse.json({ success: false, error: { code, message } }, { status });
  }
}

export async function POST(req: NextRequest) {
  const guard = await adminApiGuard(req, 'write');
  if (!guard.ok) return guard.response;
  try {
    const engine = DeveloperWorkspaceEngine.getInstance();
    const body = await req.json().catch(() => ({}));
    const role = body.operatorRole;
    if (role !== 'OPERATOR' && role !== 'ADMIN' && role !== 'SYSTEM') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'operatorRole must be OPERATOR, ADMIN or SYSTEM' } },
        { status: 400 }
      );
    }
    const result = engine.createCredential(
      {
        appId: 'operator-console',
        name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : undefined,
        environment: body.environment === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX',
        scopes: Array.isArray(body.scopes) ? body.scopes.filter((s: unknown) => typeof s === 'string') : undefined,
        ownerUserId: guard.context.userId,
        operatorRole: role,
      },
      guard.context.userId || 'admin-console'
    );
    return NextResponse.json(
      { success: true, data: { credential: result.credential, secretKeyRaw: result.secretKeyRaw } },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof DeveloperWorkspaceEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof DeveloperWorkspaceEngineError ? err.httpStatus : 500;
    return NextResponse.json({ success: false, error: { code, message } }, { status });
  }
}
