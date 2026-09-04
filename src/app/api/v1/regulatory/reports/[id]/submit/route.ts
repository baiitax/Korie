import { NextRequest, NextResponse } from 'next/server';
import { RegulatorySubmissionEngine } from '@/lib/reporting/RegulatorySubmissionEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const submittedBy = body.submittedBy || 'Chief Financial Officer';

    const engine = RegulatorySubmissionEngine.getInstance();
    const res = engine.submitSnapshot(id, submittedBy);

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || 'SUBMISSION_FAILED' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: res.submission,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
