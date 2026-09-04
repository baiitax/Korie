// =============================================================================
// File: src/app/api/v1/adashi/cycles/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AdashiStore } from '@/lib/adashi/AdashiStore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adashiId = searchParams.get('adashiId') || undefined;

    const cycles = AdashiStore.getCycles(adashiId);
    return NextResponse.json({ success: true, count: cycles.length, data: cycles });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
