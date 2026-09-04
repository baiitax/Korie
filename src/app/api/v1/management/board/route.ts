import { NextRequest, NextResponse } from 'next/server';
import { BoardReportingEngine } from '@/lib/reporting/BoardReportingEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = BoardReportingEngine.getInstance();
    const packs = engine.getPacks();
    const actions = engine.getActions();

    return NextResponse.json({
      success: true,
      data: {
        packs,
        actions,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
