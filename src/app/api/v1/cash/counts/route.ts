import { NextRequest, NextResponse } from 'next/server';
import { CashPositionEngine } from '@/lib/cash/CashPositionEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId') || undefined;

    const engine = CashPositionEngine.getInstance();
    const counts = engine.getCounts(locationId);

    return NextResponse.json({
      success: true,
      data: counts,
      count: counts.length,
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
    const engine = CashPositionEngine.getInstance();
    const count = engine.recordPhysicalCount(body);

    return NextResponse.json({
      success: true,
      data: count,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
