import { NextResponse } from 'next/server';
import { DisputeChargebackEngine } from '@/lib/recovery/DisputeChargebackEngine';

export async function GET(request: Request) {
  try {
    const engine = DisputeChargebackEngine.getInstance();
    const chargebacks = engine.getChargebacks();

    return NextResponse.json({
      success: true,
      data: {
        chargebacks,
        total: chargebacks.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
