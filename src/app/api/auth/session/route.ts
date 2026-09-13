import { NextResponse } from 'next/server';
import { SessionEngine } from '@/lib/auth/SessionEngine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/session — verifies the presented session bearer against the
 * server registry. Replaces the hardcoded always-valid demo user: unknown,
 * revoked, expired, or subject-less sessions answer 401 with distinct codes.
 */
export async function GET(request: Request) {
  const header = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED_MISSING_TOKEN',
          message: 'Missing or malformed Authorization header. Provide a session bearer.',
        },
      },
      { status: 401 }
    );
  }
  const check = SessionEngine.getInstance().verifySession(token);
  if (!check.ok) {
    const messages: Record<string, string> = {
      INVALID_SESSION: 'This session is invalid or unrecognized.',
      SESSION_REVOKED: 'This session has been signed out.',
      SESSION_EXPIRED: 'This session has expired. Verify a fresh code.',
      SESSION_SUBJECT_GONE: 'This session no longer maps to a registered customer or agent.',
    };
    return NextResponse.json(
      { success: false, error: { code: check.code, message: messages[check.code] } },
      { status: 401 }
    );
  }
  const s = check.session;
  return NextResponse.json({
    success: true,
    data: {
      sessionValid: true,
      sessionId: s.id,
      subjectType: s.subjectType,
      subjectId: s.subjectId,
      identifierMasked: s.identifierMasked,
      scopes: s.scopes,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      lastUsedAt: s.lastUsedAt,
    },
  });
}
