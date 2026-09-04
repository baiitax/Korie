import { NextRequest, NextResponse } from 'next/server';
import { WebhookPlatformEngine } from '@/lib/integration/WebhookPlatformEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const engine = WebhookPlatformEngine.getInstance();
    const res = engine.replayDelivery(id);

    if (!res.success) {
      return NextResponse.json({ success: false, error: 'WEBHOOK_DELIVERY_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: res.delivery,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
