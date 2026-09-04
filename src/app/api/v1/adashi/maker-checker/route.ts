// =============================================================================
// File: src/app/api/v1/adashi/maker-checker/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AdashiStore } from '@/lib/adashi/AdashiStore';
import { AdashiMakerCheckerEngine } from '@/lib/adashi/AdashiMakerCheckerEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;

    const requests = AdashiStore.getMakerCheckerRequests(status);
    return NextResponse.json({ success: true, count: requests.length, data: requests });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const checkerId = req.headers.get('x-user-id') || 'usr-adm-001';
    const checkerName = req.headers.get('x-user-name') || 'Alhaji Umar Sanusi (Super Admin)';
    const checkerRole = req.headers.get('x-user-role') || 'SUPER_ADMIN';

    if (!body.requestId || !body.action) {
      return NextResponse.json(
        { success: false, error: 'requestId and action (APPROVE|REJECT) are required' },
        { status: 400 }
      );
    }

    const updated = AdashiMakerCheckerEngine.actionRequest(
      body.requestId,
      checkerId,
      checkerName,
      checkerRole,
      body.action,
      body.checkerNotes || 'Actioned via Admin Console'
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
