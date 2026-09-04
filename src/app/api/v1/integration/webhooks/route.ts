import { NextRequest, NextResponse } from 'next/server';
import { WebhookPlatformEngine } from '@/lib/integration/WebhookPlatformEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = WebhookPlatformEngine.getInstance();
    const deliveries = engine.getDeliveries();

    return NextResponse.json({
      success: true,
      data: deliveries,
      count: deliveries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
