import { NextRequest, NextResponse } from 'next/server';
import { EarlyWarningEngine } from '@/lib/intelligence/EarlyWarningEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = EarlyWarningEngine.getInstance();
    const alerts = engine.getAlerts();

    return NextResponse.json({
      success: true,
      data: alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
