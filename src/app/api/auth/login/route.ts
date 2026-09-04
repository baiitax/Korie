import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/authService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password, rememberDevice, country, selectedRoleOverride } = body;

    const authService = AuthService.getInstance();
    const result = await authService.authenticate({
      identifier,
      password,
      rememberDevice,
      country,
      selectedRoleOverride,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.errorCode || 'AUTHENTICATION_FAILED',
            message: result.errorMessage || 'Invalid authentication credentials provided.',
          },
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        redirectTo: result.redirectTo,
        requiresMfa: result.requiresMfa,
        maskedDestination: result.maskedDestination,
        sessionExpiry: result.sessionExpiry,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_AUTH_ERROR',
          message: 'An unexpected security desk error occurred during authentication processing.',
        },
      },
      { status: 500 }
    );
  }
}
