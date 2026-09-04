import { NextResponse } from 'next/server';
import { DisputeChargebackEngine } from '@/lib/recovery/DisputeChargebackEngine';

export async function GET(request: Request) {
  try {
    const engine = DisputeChargebackEngine.getInstance();
    const disputes = engine.getDisputes();

    return NextResponse.json({
      success: true,
      data: {
        disputes,
        total: disputes.length,
        open: disputes.filter((d) => d.status !== 'RESOLVED').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const engine = DisputeChargebackEngine.getInstance();

    const dispute = engine.createDispute({
      transactionReference: body.transactionReference,
      claimantId: body.claimantId || 'cust-ng-001-ibrahim',
      claimantName: body.claimantName || 'Ibrahim Bello',
      claimantType: body.claimantType || 'CUSTOMER',
      category: body.category || 'DUPLICATE_CHARGE',
      claimAmount: parseFloat(body.claimAmount),
      currency: body.currency || 'NGN',
      priority: body.priority || 'P1',
    });

    return NextResponse.json({ success: true, dispute });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
