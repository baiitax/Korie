import { NextRequest, NextResponse } from 'next/server';
import { CashLocationEngine } from '@/lib/cash/CashLocationEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get('country') || undefined;
    const type = (searchParams.get('type') as any) || undefined;

    const engine = CashLocationEngine.getInstance();
    const locations = engine.getLocations({ country, type });

    return NextResponse.json({
      success: true,
      data: locations,
      count: locations.length,
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
    const engine = CashLocationEngine.getInstance();
    const location = engine.registerLocation(body);

    return NextResponse.json({
      success: true,
      data: location,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
