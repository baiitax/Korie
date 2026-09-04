import { NextRequest, NextResponse } from 'next/server';
import { AlmMaturityEngine } from '@/lib/treasury/AlmMaturityEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currency = (searchParams.get('currency') as 'NGN' | 'XOF') || 'NGN';

    const engine = AlmMaturityEngine.getInstance();
    const ladder = engine.getMaturityLadders(currency);

    return NextResponse.json({
      success: true,
      data: ladder,
      count: ladder.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
