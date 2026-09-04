import { NextRequest, NextResponse } from 'next/server';
import { ReportDefinitionEngine } from '@/lib/reporting/ReportDefinitionEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const approver = body.approver || 'Chief Financial Officer';

    const engine = ReportDefinitionEngine.getInstance();
    const res = engine.approveSnapshot(id, approver);

    if (!res.success) {
      return NextResponse.json({ success: false, error: 'SNAPSHOT_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: res.snapshot,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
