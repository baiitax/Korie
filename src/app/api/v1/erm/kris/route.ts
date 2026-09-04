import { NextRequest, NextResponse } from 'next/server';
import { KriEngine } from '@/lib/erm/KriEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = KriEngine.getInstance();
    const kris = engine.getKris();

    return NextResponse.json({
      success: true,
      data: kris,
      count: kris.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
