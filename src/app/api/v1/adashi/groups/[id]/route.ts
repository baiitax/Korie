// =============================================================================
// File: src/app/api/v1/adashi/groups/[id]/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AdashiStore } from '@/lib/adashi/AdashiStore';
import { AdashiGroupLifecycleEngine } from '@/lib/adashi/AdashiGroupLifecycleEngine';
import { AdashiRiskComplianceEngine } from '@/lib/adashi/AdashiRiskComplianceEngine';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = AdashiStore.getGroupById(id);
    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    const members = AdashiStore.getMembers(id);
    const cycles = AdashiStore.getCycles(id);
    const rotations = AdashiStore.getRotations(id);
    const compliance = AdashiRiskComplianceEngine.evaluateGroupCompliance(id);

    return NextResponse.json({
      success: true,
      data: {
        ...group,
        members,
        cycles,
        rotations,
        compliance,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const actorId = req.headers.get('x-user-id') || 'usr-agent-001';

    let result;
    if (body.action === 'LOCK_MEMBERSHIP') {
      result = AdashiGroupLifecycleEngine.lockMembership(id, actorId);
    } else if (body.action === 'START_GROUP') {
      result = AdashiGroupLifecycleEngine.startGroup(id, actorId);
    } else {
      result = AdashiStore.updateGroup(id, body);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
