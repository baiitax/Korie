import { NextRequest, NextResponse } from 'next/server';
import { LiquidityOperationsEngine } from '@/lib/cash/LiquidityOperationsEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = LiquidityOperationsEngine.getInstance();
    const summary = engine.getGlobalSummary();

    return NextResponse.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
