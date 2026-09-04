import { NextResponse } from 'next/server';
import { ComplaintDisputeEngine } from '@/lib/complaints/ComplaintDisputeEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || undefined;
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;

    const engine = ComplaintDisputeEngine.getInstance();
    const complaints = engine.getComplaints({ country, status, priority });

    return NextResponse.json({
      success: true,
      data: {
        complaints,
        total: complaints.length,
        open: complaints.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
        resolved: complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length,
        p0Critical: complaints.filter((c) => c.priority === 'P0').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const engine = ComplaintDisputeEngine.getInstance();

    const complaint = engine.createComplaint(body);
    return NextResponse.json({ success: true, complaint });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
