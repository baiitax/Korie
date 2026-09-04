import { NextResponse } from 'next/server';
import { DisputeChargebackEngine } from '@/lib/recovery/DisputeChargebackEngine';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const engine = DisputeChargebackEngine.getInstance();

    const result = engine.resolveDispute({
      disputeId: params.id,
      outcome: body.outcome,
      decisionNotes: body.decisionNotes,
      decidedBy: body.decidedBy || 'disputes.manager@koriepay.com',
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, dispute: result.dispute });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
