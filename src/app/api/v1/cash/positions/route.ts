import { NextRequest, NextResponse } from 'next/server';
import { CashPositionEngine } from '@/lib/cash/CashPositionEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get('country') || undefined;
    const currency = searchParams.get('currency') || undefined;

    const engine = CashPositionEngine.getInstance();
    const positions = engine.getPositions({ country, currency });

    return NextResponse.json({
      success: true,
      data: positions,
      count: positions.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
