import { NextRequest, NextResponse } from 'next/server';
import { CapitalManagementEngine } from '@/lib/treasury/CapitalManagementEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = CapitalManagementEngine.getInstance();
    const positions = engine.getCapitalPositions();

    return NextResponse.json({
      success: true,
      data: positions,
      count: positions.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
