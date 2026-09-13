import { NextRequest, NextResponse } from 'next/server';
import { RequestContext } from '@/types/apiGateway';
import { authenticateApiRequest } from './authMiddleware';

export interface AdminGuardPass {
  ok: true;
  context: RequestContext;
}

export interface AdminGuardFail {
  ok: false;
  response: NextResponse;
}

export type AdminGuardResult = AdminGuardPass | AdminGuardFail;

async function runScopeGuard(req: Request | NextRequest, scope: string): Promise<AdminGuardResult> {
  const auth = await authenticateApiRequest(req, [scope]);
  if (!auth.isAuthenticated || !auth.context) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: { code: auth.errorCode, message: auth.errorMessage },
        },
        { status: auth.httpStatus && auth.httpStatus >= 400 && auth.httpStatus < 600 ? auth.httpStatus : 401 }
      ),
    };
  }
  return { ok: true, context: auth.context };
}

/**
 * Guards the admin console API surface (`/api/admin/*`).
 * GET handlers pass 'read' (requires `admin:read`), mutations pass 'write'
 * (requires `admin:write`). `admin:*` and `*` also satisfy via scopeSatisfies.
 */
export function adminApiGuard(req: Request | NextRequest, kind: 'read' | 'write'): Promise<AdminGuardResult> {
  return runScopeGuard(req, kind === 'read' ? 'admin:read' : 'admin:write');
}

/**
 * Guards the developer API surface (`/api/developers/*`).
 * GET handlers pass 'read' (requires `developer:read`), mutations pass
 * 'write' (requires `developer:write`).
 */
export function developerApiGuard(req: Request | NextRequest, kind: 'read' | 'write'): Promise<AdminGuardResult> {
  return runScopeGuard(req, kind === 'read' ? 'developer:read' : 'developer:write');
}
