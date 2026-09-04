import { NextRequest, NextResponse } from 'next/server';
import { DataGovernanceEngine } from '@/lib/reporting/DataGovernanceEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = DataGovernanceEngine.getInstance();
    const adjustments = engine.getAdjustments();

    return NextResponse.json({
      success: true,
      data: adjustments,
      count: adjustments.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const engine = DataGovernanceEngine.getInstance();
    const adj = engine.requestAdjustment(body);

    return NextResponse.json({
      success: true,
      data: adj,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
