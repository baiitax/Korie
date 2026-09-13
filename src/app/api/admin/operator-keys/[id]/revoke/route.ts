import { NextRequest, NextResponse } from 'next/server';
import { DeveloperWorkspaceEngine, DeveloperWorkspaceEngineError } from '@/lib/developer/DeveloperWorkspaceEngine';
import { adminApiGuard } from '@/lib/security/apiGuards';

export const dynamic = 'force-dynamic';

/** POST /api/admin/operator-keys/[id]/revoke — immediate, fails closed. */
export async function POST(req: NextRequest) {
  const guard = await adminApiGuard(req, 'write');
  if (!guard.ok) return guard.response;
  try {
    const engine = DeveloperWorkspaceEngine.getInstance();
    const id = req.url.split('/')[req.url.split('/').length - 2];
    const credential = engine.revokeCredential(id, guard.context.userId || 'admin-console');
    return NextResponse.json({ success: true, data: { credential } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof DeveloperWorkspaceEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof DeveloperWorkspaceEngineError ? err.httpStatus : 500;
    return NextResponse.json({ success: false, error: { code, message } }, { status });
  }
}
