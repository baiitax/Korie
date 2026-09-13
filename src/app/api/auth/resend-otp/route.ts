import { NextResponse } from 'next/server';
import { SessionEngine, SessionEngineError } from '@/lib/auth/SessionEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const identifier = String(body.identifier || '');
    const country = body.country === 'NE' ? 'NE' : 'NG';
    const result = SessionEngine.getInstance().requestOtp(identifier, country);
    return NextResponse.json({
      success: true,
      data: {
        dispatched: result.dispatched,
        channel: result.channel,
        maskedDestination: result.maskedDestination,
        expiresInSeconds: result.expiresInSeconds,
        // Honest sandbox note: no SMS/email provider is integrated. testCode
        // is present only in test mode (non-production, or production with
        // explicit KORIE_ALLOW_OTP_TEST) — never by default in production.
        testMode: result.testMode,
        ...(result.testCode ? { testCode: result.testCode } : {}),
      },
    });
  } catch (err: unknown) {
    if (err instanceof SessionEngineError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.httpStatus }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'OTP_RESEND_ERROR',
          message: 'Failed to dispatch new verification code.',
        },
      },
      { status: 500 }
    );
  }
}
