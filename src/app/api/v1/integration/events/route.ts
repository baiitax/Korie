import { NextRequest, NextResponse } from 'next/server';
import { EnterpriseEventBusEngine } from '@/lib/integration/EnterpriseEventBusEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = EnterpriseEventBusEngine.getInstance();
    const outbox = engine.getOutboxEvents();
    const deadLetters = engine.getDeadLetters();

    return NextResponse.json({
      success: true,
      data: {
        outbox,
        deadLetters,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
