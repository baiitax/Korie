// =============================================================================
// File: src/app/api/v1/adashi/payouts/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AdashiStore } from '@/lib/adashi/AdashiStore';
import { AdashiPayoutEngine } from '@/lib/adashi/AdashiPayoutEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adashiId = searchParams.get('adashiId') || undefined;

    const payouts = AdashiStore.getPayouts(adashiId);
    return NextResponse.json({ success: true, count: payouts.length, data: payouts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const makerId = req.headers.get('x-user-id') || 'usr-agent-001';
    const makerName = req.headers.get('x-user-name') || 'Agent Ibrahim Danladi';

    if (!body.adashiId || !body.cycleId) {
      return NextResponse.json(
        { success: false, error: 'adashiId and cycleId are required' },
        { status: 400 }
      );
    }

    const payout = AdashiPayoutEngine.initiatePayout({
      adashiId: body.adashiId,
      cycleId: body.cycleId,
      makerId,
      makerName,
      destinationType: body.destinationType,
      destinationAccountId: body.destinationAccountId,
    });

    return NextResponse.json({ success: true, data: payout }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
