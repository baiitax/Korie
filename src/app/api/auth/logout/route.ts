import { NextResponse } from 'next/server';
import { SessionEngine } from '@/lib/auth/SessionEngine';

export async function POST(request: Request) {
  // Best-effort server-side revocation: a presented session bearer is
  // destroyed in the registry. Idempotent — logging out twice still succeeds.
  let sessionRevoked = false;
  try {
    const header = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    const token = header.replace(/^Bearer\s+/i, '').trim();
    if (token.startsWith('kp_sess_')) {
      sessionRevoked = SessionEngine.getInstance().revokeSession(token);
    }
  } catch {
    /* registry hiccup — cookies are still cleared below */
  }

  const response = NextResponse.json({
    success: true,
    data: {
      loggedOut: true,
      sessionRevoked,
      timestamp: new Date().toISOString(),
    },
  });

  // Clear session cookies safely
  response.cookies.delete('kp_session');
  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');

  return response;
}
