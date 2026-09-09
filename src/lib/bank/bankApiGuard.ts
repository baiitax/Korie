// =============================================================================
// Bank API bearer guard (sandbox): accepts the documented demo credentials
// (kp_test_… / kp_live_…). Real deployments must validate JWTs/signed keys in
// a session layer — this mirrors the sandbox convention used across the repo.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

export function bankApiGuard(req: NextRequest): NextResponse | null {
  const header = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const ok =
    token.startsWith('kp_test_') ||
    token.startsWith('kp_live_') ||
    (typeof process !== 'undefined' && process.env.KORIE_BANK_DEMO_KEY && token === process.env.KORIE_BANK_DEMO_KEY);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Provide a valid Bank API bearer (kp_test_… / kp_live_…).' } },
      { status: 401 },
    );
  }
  return null;
}
