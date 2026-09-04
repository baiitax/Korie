import { NextRequest, NextResponse } from 'next/server';
import { CashVarianceEngine } from '@/lib/cash/CashVarianceEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = CashVarianceEngine.getInstance();
    const variances = engine.getVariances();

    return NextResponse.json({
      success: true,
      data: variances,
      count: variances.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
