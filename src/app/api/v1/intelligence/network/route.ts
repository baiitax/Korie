import { NextRequest, NextResponse } from 'next/server';
import { NetworkGraphEngine } from '@/lib/intelligence/NetworkGraphEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = NetworkGraphEngine.getInstance();
    const topology = engine.getTopology();

    return NextResponse.json({
      success: true,
      data: topology,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
