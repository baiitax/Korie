import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    data: {
      loggedOut: true,
      timestamp: new Date().toISOString(),
    },
  });

  // Clear session cookies safely
  response.cookies.delete('kp_session');
  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');

  return response;
}
