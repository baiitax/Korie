import { NextResponse } from 'next/server';
import { SecurityEventPipeline } from '@/lib/iam/SecurityEventPipeline';

export async function GET(request: Request) {
  try {
    const pipeline = SecurityEventPipeline.getInstance();
    const alerts = pipeline.getAlerts();

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
        high: alerts.filter((a) => a.severity === 'HIGH').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
