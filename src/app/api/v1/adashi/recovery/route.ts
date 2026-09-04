// =============================================================================
// File: src/app/api/v1/adashi/recovery/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AdashiStore } from '@/lib/adashi/AdashiStore';
import { AdashiDefaultRecoveryEngine } from '@/lib/adashi/AdashiDefaultRecoveryEngine';

export async function GET() {
  try {
    const recoveryCases = AdashiStore.getRecoveryCases();
    return NextResponse.json({ success: true, count: recoveryCases.length, data: recoveryCases });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actorId = req.headers.get('x-user-id') || 'usr-agent-001';

    if (body.action === 'CREATE_CASE') {
      const newCase = AdashiDefaultRecoveryEngine.createRecoveryCase(
        body.obligationId,
        body.notes || 'Defaulted obligation escalated',
        actorId
      );
      return NextResponse.json({ success: true, data: newCase }, { status: 201 });
    } else if (body.action === 'TRANSITION_STAGE') {
      const updatedCase = AdashiDefaultRecoveryEngine.transitionStage(
        body.caseId,
        body.newStage,
        body.recoveredAmountToAdd || 0,
        body.notes
      );
      return NextResponse.json({ success: true, data: updatedCase });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
