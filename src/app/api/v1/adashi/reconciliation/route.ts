// =============================================================================
// File: src/app/api/v1/adashi/reconciliation/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AdashiReconciliationEngine } from '@/lib/adashi/AdashiReconciliationEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currency = (searchParams.get('currency') as 'NGN' | 'XOF') || 'NGN';

    const report = AdashiReconciliationEngine.runEscrowReconciliation(currency);
    return NextResponse.json({ success: true, data: report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
