import { NextRequest, NextResponse } from 'next/server';
import { ControlLibraryEngine } from '@/lib/erm/ControlLibraryEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const engine = ControlLibraryEngine.getInstance();
    const res = engine.testControl(id);

    if (!res.success) {
      return NextResponse.json({ success: false, error: 'CONTROL_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: res.control,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
