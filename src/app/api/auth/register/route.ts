import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/authService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authService = AuthService.getInstance();

    const result = await authService.registerCustomer(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.errorCode || 'REGISTRATION_FAILED',
            message: result.errorMessage || 'Unable to complete customer registration.',
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        requiresOtp: result.requiresOtp,
        maskedDestination: result.maskedDestination,
        redirectTo: result.redirectTo,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message: 'An internal error occurred during account creation.',
        },
      },
      { status: 500 }
    );
  }
}
