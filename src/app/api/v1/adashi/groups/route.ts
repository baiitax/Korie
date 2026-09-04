// =============================================================================
// File: src/app/api/v1/adashi/groups/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AdashiStore } from '@/lib/adashi/AdashiStore';
import { AdashiGroupLifecycleEngine } from '@/lib/adashi/AdashiGroupLifecycleEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currency = searchParams.get('currency');
    const status = searchParams.get('status');

    let groups = AdashiStore.getGroups();
    if (currency) groups = groups.filter((g) => g.currency === currency);
    if (status) groups = groups.filter((g) => g.status === status);

    return NextResponse.json({ success: true, count: groups.length, data: groups });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const group = AdashiGroupLifecycleEngine.createGroup(body);
    return NextResponse.json({ success: true, data: group }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
