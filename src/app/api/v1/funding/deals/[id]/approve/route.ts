import { NextRequest, NextResponse } from 'next/server';
import { FundingManagementEngine } from '@/lib/treasury/FundingManagementEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const engine = FundingManagementEngine.getInstance();

    const res = engine.approveAndExecuteDeal(
      id,
      body.checkerId || 'group.treasurer@koriepay.com'
    );

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
