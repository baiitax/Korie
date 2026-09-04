import { NextResponse } from 'next/server';
import { RefundReversalEngine } from '@/lib/recovery/RefundReversalEngine';

export async function GET(request: Request) {
  try {
    const engine = RefundReversalEngine.getInstance();
    const refunds = engine.getRefunds();

    return NextResponse.json({
      success: true,
      data: {
        refunds,
        total: refunds.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const engine = RefundReversalEngine.getInstance();

    const result = engine.executeRefund({
      originalTransactionReference: body.originalTransactionReference,
      customerId: body.customerId || 'cust-ng-001-ibrahim',
      customerName: body.customerName || 'Ibrahim Bello',
      originalAmount: parseFloat(body.originalAmount),
      refundAmount: parseFloat(body.refundAmount),
      currency: body.currency || 'NGN',
      refundReason: body.refundReason,
      requestedBy: body.requestedBy || 'support.lead@koriepay.ng',
      country: body.currency === 'XOF' ? 'NE' : 'NG',
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, refund: result.refund });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
