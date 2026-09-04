import { NextRequest, NextResponse } from 'next/server';
import { RestatementEngine } from '@/lib/reporting/RestatementEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = RestatementEngine.getInstance();
    const restatements = engine.getRestatements();

    return NextResponse.json({
      success: true,
      data: restatements,
      count: restatements.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
