import { NextResponse } from 'next/server';
import { DisputeChargebackEngine } from '@/lib/recovery/DisputeChargebackEngine';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const engine = DisputeChargebackEngine.getInstance();
    const dispute = engine.getDispute(params.id);

    if (!dispute) {
      return NextResponse.json({ success: false, error: 'DISPUTE_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true, dispute });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
