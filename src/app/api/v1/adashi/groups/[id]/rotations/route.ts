// =============================================================================
// File: src/app/api/v1/adashi/groups/[id]/rotations/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AdashiStore } from '@/lib/adashi/AdashiStore';
import { AdashiRotationAllocationEngine } from '@/lib/adashi/AdashiRotationAllocationEngine';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rotations = AdashiStore.getRotations(id);
    return NextResponse.json({ success: true, count: rotations.length, data: rotations });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const actorId = req.headers.get('x-user-id') || 'usr-agent-001';

    const result = AdashiRotationAllocationEngine.generateRotation(
      id,
      actorId,
      body.customSeed
    );

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
