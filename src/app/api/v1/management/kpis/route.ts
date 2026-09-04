import { NextRequest, NextResponse } from 'next/server';
import { ManagementKpiEngine } from '@/lib/reporting/ManagementKpiEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = ManagementKpiEngine.getInstance();
    const kpis = engine.getKpis();

    return NextResponse.json({
      success: true,
      data: kpis,
      count: kpis.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
