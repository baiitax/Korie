// =============================================================================
// File: src/app/api/v1/adashi/obligations/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AdashiStore } from '@/lib/adashi/AdashiStore';
import { AdashiCycleObligationEngine } from '@/lib/adashi/AdashiCycleObligationEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adashiId = searchParams.get('adashiId') || undefined;
    const cycleId = searchParams.get('cycleId') || undefined;

    const obligations = AdashiStore.getObligations(adashiId, cycleId);
    return NextResponse.json({ success: true, count: obligations.length, data: obligations });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idempotencyKey = req.headers.get('idempotency-key') || undefined;

    if (!body.obligationId) {
      return NextResponse.json({ success: false, error: 'obligationId is required' }, { status: 400 });
    }

    const result = AdashiCycleObligationEngine.processContributionPayment(
      body.obligationId,
      body.paymentMethod || 'WALLET_AUTO_DEBIT',
      idempotencyKey
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
