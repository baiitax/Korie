import { NextRequest, NextResponse } from 'next/server';
import { ConsumerProtectionEngine } from '@/lib/agency/ConsumerProtectionEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const engine = ConsumerProtectionEngine.getInstance();

    const result = engine.resolveComplaintWithRedress({
      complaintId: id,
      notes: body.notes || 'Redress approved by compliance officer',
      resolvedBy: body.resolvedBy || 'compliance@koriepay.com',
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: 'COMPLAINT_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.complaint,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
