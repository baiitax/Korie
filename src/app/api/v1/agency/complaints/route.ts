import { NextRequest, NextResponse } from 'next/server';
import { ConsumerProtectionEngine } from '@/lib/agency/ConsumerProtectionEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = ConsumerProtectionEngine.getInstance();
    const complaints = engine.getComplaints();

    return NextResponse.json({
      success: true,
      data: complaints,
      count: complaints.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
