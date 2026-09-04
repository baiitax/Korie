import { NextResponse } from 'next/server';
import { SecurityPostureEngine } from '@/lib/iam/SecurityPostureEngine';

export async function GET(request: Request) {
  try {
    const engine = SecurityPostureEngine.getInstance();
    const posture = engine.computePosture();

    return NextResponse.json({
      success: true,
      data: posture,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
