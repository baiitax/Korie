import { NextRequest, NextResponse } from 'next/server';
import { ReverseStressEngine } from '@/lib/treasury/ReverseStressEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = ReverseStressEngine.getInstance();
    const results = engine.runReverseStressTests();

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
