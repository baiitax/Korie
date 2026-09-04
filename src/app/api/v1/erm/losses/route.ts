import { NextRequest, NextResponse } from 'next/server';
import { OperationalLossEngine } from '@/lib/erm/OperationalLossEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = OperationalLossEngine.getInstance();
    const losses = engine.getLossEvents();

    return NextResponse.json({
      success: true,
      data: losses,
      count: losses.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
