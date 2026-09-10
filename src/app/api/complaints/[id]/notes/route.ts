// Admin case notes — the desk's reply/note actions previously wrote into a React
// array that vanished on reload. Notes are append-only, attributed, and flagged
// internal when they are not for the customer.
// POST /api/complaints/[id]/notes  { body, by, internal? }
import { NextResponse } from 'next/server';
import { ComplaintDisputeEngine } from '@/lib/complaints/ComplaintDisputeEngine';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = String(body.body || body.note || '').trim();
    const author = String(body.by || body.author || '').trim();
    const internal = body.internal === undefined ? true : Boolean(body.internal);

    if (!author.includes('@')) {
      return NextResponse.json({ success: false, error: 'AUTHOR_EMAIL_REQUIRED' }, { status: 400 });
    }

    const result = ComplaintDisputeEngine.getInstance().addCaseNote({
      complaintId: params.id,
      body: text,
      by: author,
      internal,
    });
    if (!result.ok) {
      const status = result.error === 'COMPLAINT_NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ success: false, error: result.error || 'NOTE_FAILED' }, { status });
    }
    return NextResponse.json({ success: true, noteId: result.noteId, complaint: result.complaint });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
