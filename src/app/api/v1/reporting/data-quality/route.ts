import { NextRequest, NextResponse } from 'next/server';
import { DataQualityEngine } from '@/lib/reporting/DataQualityEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = DataQualityEngine.getInstance();
    const runs = engine.getRuns();

    return NextResponse.json({
      success: true,
      data: runs,
      healthScore: engine.getOverallHealthScore(),
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
