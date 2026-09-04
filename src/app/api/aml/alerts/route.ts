import { NextResponse } from 'next/server';
import { AmlAlertEngine } from '@/lib/aml/AmlAlertEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity') || undefined;
    const status = searchParams.get('status') || undefined;
    const customerId = searchParams.get('customerId') || undefined;

    const engine = AmlAlertEngine.getInstance();
    const alerts = engine.getAlerts({ severity, status, customerId });

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        total: alerts.length,
        p0Critical: alerts.filter((a) => a.severity === 'P0_CRITICAL').length,
        inReview: alerts.filter((a) => a.status === 'IN_REVIEW' || a.status === 'ASSIGNED').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
