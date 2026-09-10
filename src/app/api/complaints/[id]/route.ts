// =============================================================================
// Admin complaint actions — engine-backed triage & financial redress.
//   GET    /api/complaints/[id]  full case record: history, notes, SLA state,
//                                the redress journal actually posted, and the
//                                customer's own satisfaction rating.
//   PATCH  /api/complaints/[id]  transition status (assign/investigate/resolve/close)
//   POST   /api/complaints/[id]  { action: "COMPENSATE", amount, reason,
//                                  authorizedByEmail } → engine compensation
//                                 (real double-entry journal: redress expense DR,
//                                  customer wallet CR) + complaint RESOLVED.
// Engine methods are the only mutation path — no client-side state.
// =============================================================================

import { NextResponse } from 'next/server';
import { ComplaintDisputeEngine } from '@/lib/complaints/ComplaintDisputeEngine';
import { GeneralLedgerEngine } from '@/lib/financial/GeneralLedgerEngine';
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

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const engine = ComplaintDisputeEngine.getInstance();
    const complaint = engine.getComplaint(params.id);
    if (!complaint) {
      return NextResponse.json({ success: false, error: 'COMPLAINT_NOT_FOUND' }, { status: 404 });
    }

    // Redress is read from the ledger, not from the case's own summary line.
    const journal = complaint.glJournalId
      ? GeneralLedgerEngine.getInstance()
          .getJournals(200)
          .find((j) => j.id === complaint.glJournalId) || null
      : null;

    return NextResponse.json({
      success: true,
      data: {
        complaint,
        statusHistory: complaint.statusHistory || [],
        caseNotes: complaint.caseNotes || [],
        intakeChannel: complaint.intakeChannel ?? null,
        sla: {
          dueAt: complaint.slaDueAt,
          policyHours: ComplaintDisputeEngine.SLA_HOURS[complaint.priority],
          breachedAtRead: ComplaintDisputeEngine.computeBreach(complaint),
          storedFlag: complaint.isSlaBreached,
        },
        redressJournal: journal
          ? {
              journalNumber: journal.journalNumber,
              currency: journal.currency,
              amount: journal.lines.filter((l) => l.accountCode === '5010').reduce((a, l) => a + l.amount, 0),
              narration: journal.narration,
              postedBy: journal.postedBy,
              createdAt: journal.createdAt,
            }
          : null,
        satisfaction:
          complaint.csatScore === undefined
            ? null
            : {
                score: complaint.csatScore,
                comment: complaint.csatComment ?? null,
                channel: complaint.csatChannel ?? null,
                capturedAt: complaint.csatCapturedAt ?? null,
              },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

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
