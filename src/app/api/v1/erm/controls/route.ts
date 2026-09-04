import { NextRequest, NextResponse } from 'next/server';
import { ControlLibraryEngine } from '@/lib/erm/ControlLibraryEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = ControlLibraryEngine.getInstance();
    const controls = engine.getControls();

    return NextResponse.json({
      success: true,
      data: controls,
      count: controls.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
