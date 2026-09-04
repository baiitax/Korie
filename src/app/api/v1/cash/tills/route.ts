import { NextRequest, NextResponse } from 'next/server';
import { TillManagementEngine } from '@/lib/cash/TillManagementEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = TillManagementEngine.getInstance();
    const tills = engine.getTills();

    return NextResponse.json({
      success: true,
      data: tills,
      count: tills.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const engine = TillManagementEngine.getInstance();

    if (body.action === 'OPEN') {
      const res = engine.openTill(body);
      return NextResponse.json(res);
    }

    if (body.action === 'HANDOVER') {
      const res = engine.executeHandover(body);
      return NextResponse.json(res);
    }

    if (body.action === 'CLOSE') {
      const res = engine.closeTill(body);
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
