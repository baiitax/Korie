import { NextResponse } from 'next/server';
import { ComplaintDisputeEngine } from '@/lib/complaints/ComplaintDisputeEngine';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const engine = ComplaintDisputeEngine.getInstance();
    const complaint = engine.getComplaint(params.id);

    if (!complaint) {
      return NextResponse.json({ success: false, error: 'COMPLAINT_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true, complaint });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const engine = ComplaintDisputeEngine.getInstance();

    if (body.action === 'TRANSITION_STATUS') {
      const result = engine.transitionStatus(params.id, body.status, body.notes, body.assignedToEmail);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, complaint: result.complaint });
    }

    if (body.action === 'COMPENSATE') {
      const result = engine.executeFinancialCompensation({
        complaintId: params.id,
        compensationAmount: Number(body.amount),
        reason: body.reason || 'Customer redress settlement',
        authorizedByEmail: body.authorizedByEmail || 'compliance.controller@koriepay.com',
      });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        complaint: result.complaint,
        journalNumber: result.journalNumber,
      });
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
