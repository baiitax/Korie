import { NextRequest, NextResponse } from 'next/server';
import { ReportDefinitionEngine } from '@/lib/reporting/ReportDefinitionEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = ReportDefinitionEngine.getInstance();
    const snapshots = engine.getSnapshots();

    return NextResponse.json({
      success: true,
      data: snapshots,
      count: snapshots.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
