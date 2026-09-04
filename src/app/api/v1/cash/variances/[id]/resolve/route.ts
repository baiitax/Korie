import { NextRequest, NextResponse } from 'next/server';
import { CashVarianceEngine } from '@/lib/cash/CashVarianceEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const engine = CashVarianceEngine.getInstance();

    const res = engine.resolveVariance({
      varianceId: id,
      rootCauseNotes: body.rootCauseNotes || 'Resolved by operational supervisor',
      resolvedBy: body.resolvedBy || 'compliance@koriepay.com',
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: 'VARIANCE_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: res.variance,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
