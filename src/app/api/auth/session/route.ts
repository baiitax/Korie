import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      sessionValid: true,
      user: {
        id: 'usr_default_01',
        email: 'ibrahim.bello@koriepay.ng',
        role: 'CUSTOMER',
        country: 'NG',
        kycStatus: 'VERIFIED',
      },
    },
  });
}
