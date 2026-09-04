import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { identifier } = await request.json();

    return NextResponse.json({
      success: true,
      data: {
        dispatched: true,
        channel: 'SMS_AND_EMAIL',
        expiresInSeconds: 600,
      },
    });
  } catch {
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
