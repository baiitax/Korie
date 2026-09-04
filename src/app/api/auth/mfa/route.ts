import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { factorId, code } = await request.json();

    if (!code || code.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_MFA_TOKEN',
            message: 'A valid 6-digit authenticator code or emergency key is required.',
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        aalLevel: 'AAL2',
        sessionElevated: true,
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MFA_CHALLENGE_ERROR',
          message: 'Unable to verify multi-factor authentication token.',
        },
      },
      { status: 500 }
    );
  }
}
