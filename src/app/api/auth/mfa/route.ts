import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code || String(code).trim().length < 6) {
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

    // HONEST DEFAULT: this route used to answer AAL2/sessionElevated for ANY
    // 6-digit string. No authenticator enrollment exists server-side (no TOTP
    // secrets, no verified factors), so there is nothing truthful to verify
    // against. Refuse instead of fabricating an assurance level.
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MFA_NOT_ENROLLED',
          message:
            'Authenticator MFA is not enrolled: no verification factor exists for this subject, so step-up cannot complete.',
        },
      },
      { status: 501 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MFA_ERROR',
          message: 'Unable to process the MFA challenge at this time.',
        },
      },
      { status: 500 }
    );
  }
}
