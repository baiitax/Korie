import { NextResponse } from 'next/server';
import { WorkforceIamEngine } from '@/lib/iam/WorkforceIamEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || undefined;

    const engine = WorkforceIamEngine.getInstance();
    const sessions = engine.getSessions(email);

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        totalActive: sessions.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
