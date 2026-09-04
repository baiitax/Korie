import { NextResponse } from 'next/server';
import { AmlCaseManagementEngine } from '@/lib/aml/AmlCaseManagementEngine';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const engine = AmlCaseManagementEngine.getInstance();
    const caseRecord = engine.getCase(params.id);

    if (!caseRecord) {
      return NextResponse.json({ success: false, error: 'CASE_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true, case: caseRecord });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const engine = AmlCaseManagementEngine.getInstance();

    if (body.action === 'ADD_NOTE') {
      const note = engine.addNote(
        params.id,
        body.authorEmail || 'investigator@koriepay.com',
        body.content,
        body.noteType
      );
      return NextResponse.json({ success: true, note });
    }

    if (body.action === 'SUBMIT_DECISION') {
      const result = engine.submitCaseDecision({
        caseId: params.id,
        decision: body.decision,
        notes: body.notes,
        makerEmail: body.makerEmail || 'lead.investigator@koriepay.ng',
        checkerEmail: body.checkerEmail || 'mlro@koriepay.com',
      });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, case: result.case });
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
