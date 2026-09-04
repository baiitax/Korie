import { NextRequest, NextResponse } from 'next/server';
import { UnitEconomicsEngine } from '@/lib/treasury/UnitEconomicsEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = UnitEconomicsEngine.getInstance();
    const economics = engine.getProductEconomics();

    return NextResponse.json({
      success: true,
      data: economics,
      count: economics.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
