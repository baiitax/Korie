import { NextRequest, NextResponse } from 'next/server';
import { EnterpriseEventBusEngine } from '@/lib/integration/EnterpriseEventBusEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const engine = EnterpriseEventBusEngine.getInstance();
    const res = engine.replayDeadLetter(id);

    if (!res.success) {
      return NextResponse.json({ success: false, error: 'DEAD_LETTER_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: res.event,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
