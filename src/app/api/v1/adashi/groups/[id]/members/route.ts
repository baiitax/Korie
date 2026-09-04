// =============================================================================
// File: src/app/api/v1/adashi/groups/[id]/members/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AdashiStore } from '@/lib/adashi/AdashiStore';
import { AdashiMembershipEngine } from '@/lib/adashi/AdashiMembershipEngine';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const members = AdashiStore.getMembers(id);
    return NextResponse.json({ success: true, count: members.length, data: members });
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
    const body = await req.json();
    const actorId = req.headers.get('x-user-id') || 'usr-agent-001';

    const member = AdashiMembershipEngine.inviteMember(
      {
        adashiId: id,
        customerId: body.customerId,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        kycTier: body.kycTier || 1,
      },
      actorId
    );

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const actorId = req.headers.get('x-user-id') || 'usr-cust-001';

    if (!body.memberId) {
      return NextResponse.json({ success: false, error: 'memberId is required' }, { status: 400 });
    }

    const member = AdashiMembershipEngine.captureConsent(
      body.memberId,
      body.consentGranted ?? true,
      body.mandateAuthorized ?? true,
      actorId
    );

    return NextResponse.json({ success: true, data: member });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
