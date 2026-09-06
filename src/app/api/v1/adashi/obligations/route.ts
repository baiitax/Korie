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

    // Agent console legacy path: cash collected offline from a member. The
    // engine books it as agent cash-in-transit → escrow (real journal), never
    // as a fabricated wallet debit. Wallet paths are only reachable through
    // the scoped customer BFF routes with PIN / mandate enforcement.
    const initiatedBy =
      body.initiatedBy === 'AUTO_MANDATE_DEBIT' || body.initiatedBy === 'CUSTOMER_MANUAL_PIN'
        ? body.initiatedBy
        : 'AGENT_COLLECTION';

    const outcome = await AdashiCycleObligationEngine.processContributionPayment({
      obligationId: body.obligationId,
      initiatedBy,
      idempotencyKey,
    });

    if (outcome.success) {
      return NextResponse.json({ success: true, data: outcome.obligation });
    }
    return NextResponse.json(
      {
        success: false,
        code: outcome.code,
        error: outcome.message,
      },
      { status: 400 },
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
