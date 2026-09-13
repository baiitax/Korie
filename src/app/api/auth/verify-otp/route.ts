import { NextResponse } from 'next/server';
import { SessionEngine, SessionEngineError } from '@/lib/auth/SessionEngine';

export async function POST(request: Request) {
  try {
    const { code, identifier, country } = await request.json();

    if (!code || String(code).trim().length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_OTP_LENGTH',
            message: 'A complete 6-digit one-time passcode is required.',
          },
        },
        { status: 400 }
      );
    }

    const result = SessionEngine.getInstance().verifyOtp(
      String(identifier || ''),
      String(code),
      country === 'NE' ? 'NE' : 'NG'
    );
    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        sessionToken: result.sessionToken,
        expiresAt: result.expiresAt,
        subjectType: result.subjectType,
        subjectId: result.subjectId,
        maskedDestination: result.maskedDestination,
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    if (err instanceof SessionEngineError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
        },
        { status: err.httpStatus }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'OTP_VERIFICATION_ERROR',
          message: 'Unable to verify one-time passcode at this time.',
        },
      },
      { status: 500 }
    );
  }
}
