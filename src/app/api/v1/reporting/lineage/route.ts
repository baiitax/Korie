import { NextRequest, NextResponse } from 'next/server';
import { DataLineageEngine } from '@/lib/reporting/DataLineageEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = DataLineageEngine.getInstance();
    const traces = engine.getTraces();

    return NextResponse.json({
      success: true,
      data: traces,
      count: traces.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
