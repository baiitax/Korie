import { NextRequest, NextResponse } from 'next/server';
import { FundingManagementEngine } from '@/lib/treasury/FundingManagementEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = FundingManagementEngine.getInstance();
    const deals = engine.getDeals();

    return NextResponse.json({
      success: true,
      data: deals,
      count: deals.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const engine = FundingManagementEngine.getInstance();

    const res = engine.createDeal({
      facilityId: body.facilityId,
      dealType: body.dealType,
      amount: parseFloat(body.amount),
      currency: body.currency,
      makerId: body.makerId || 'treasury.analyst@koriepay.com',
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: res.deal,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
