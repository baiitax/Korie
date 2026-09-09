// =============================================================================
// Admin complaint actions — engine-backed triage & financial redress.
//   PATCH  /api/complaints/[id]  transition status (assign/investigate/resolve/close)
//   POST   /api/complaints/[id]  { action: "COMPENSATE", amount, reason,
//                                  authorizedByEmail } → engine compensation
//                                 (real double-entry journal: redress expense DR,
//                                  customer wallet CR) + complaint RESOLVED.
// Engine methods are the only mutation path — no client-side state.
// =============================================================================

import { NextResponse } from 'next/server';
import { ComplaintDisputeEngine } from '@/lib/complaints/ComplaintDisputeEngine';
import { ComplaintStatus } from '@/types/regulatoryConsumerEngine';

const ALLOWED_STATUSES: ComplaintStatus[] = [
  'ACKNOWLEDGED',
  'CLASSIFIED',
  'ASSIGNED',
  'INVESTIGATING',
  'PENDING_CUSTOMER',
  'PENDING_PROVIDER',
  'RESOLUTION_PROPOSED',
  'RESOLVED',
  'CLOSED',
];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawStatus = String(body.status || '').trim();
    const notes = body.notes ? String(body.notes) : undefined;
    const assignedToEmail = body.assignedToEmail ? String(body.assignedToEmail) : undefined;

    if (!rawStatus) {
      return NextResponse.json({ success: false, error: 'STATUS_REQUIRED' }, { status: 400 });
    }
    if (!ALLOWED_STATUSES.includes(rawStatus as ComplaintStatus)) {
      return NextResponse.json({ success: false, error: 'STATUS_NOT_ALLOWED' }, { status: 400 });
    }

    const result = ComplaintDisputeEngine.getInstance().transitionStatus(
      params.id,
      rawStatus as ComplaintStatus,
      notes,
      assignedToEmail,
    );
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'TRANSITION_FAILED' }, { status: 404 });
    }
    return NextResponse.json({ success: true, complaint: result.complaint });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.action !== 'COMPENSATE') {
      return NextResponse.json({ success: false, error: 'UNKNOWN_ACTION' }, { status: 400 });
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'INVALID_AMOUNT' }, { status: 400 });
    }
    const reason = String(body.reason || '').trim();
    const authorizedByEmail = String(body.authorizedByEmail || '').trim();
    if (!reason || reason.length < 5 || !authorizedByEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'REASON_AND_AUTHORIZER_REQUIRED' },
        { status: 400 },
      );
    }

    const result = ComplaintDisputeEngine.getInstance().executeFinancialCompensation({
      complaintId: params.id,
      compensationAmount: amount,
      reason,
      authorizedByEmail,
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'COMPENSATION_FAILED' }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      complaint: result.complaint,
      journalNumber: result.journalNumber,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
