import { NextRequest, NextResponse } from 'next/server';
import { AlmMaturityEngine } from '@/lib/treasury/AlmMaturityEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = AlmMaturityEngine.getInstance();
    const assumptions = engine.getAssumptions();

    return NextResponse.json({
      success: true,
      data: assumptions,
      count: assumptions.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
