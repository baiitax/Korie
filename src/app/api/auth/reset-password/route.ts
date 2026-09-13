import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PASSWORD_TOO_SHORT',
            message: 'New password must be at least 8 characters long.',
          },
        },
        { status: 400 }
      );
    }

    // HONEST DEFAULT: this route used to answer passwordReset:true without a
    // recovery-code check and without any credential store to update — a
    // fabricated reset. Per-user passwords do not exist server-side (the
    // sandbox verifies a single demo password), so there is nothing truthful
    // to rotate. Refuse instead of claiming a reset happened.
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PASSWORD_RESET_UNAVAILABLE',
          message:
            'Password reset is unavailable: no per-user credential store exists server-side, so no password was changed.',
        },
      },
      { status: 501 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PASSWORD_RESET_ERROR',
          message: 'Unable to process the password reset at this time.',
        },
      },
      { status: 500 }
    );
  }
}
