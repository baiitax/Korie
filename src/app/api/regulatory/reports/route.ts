import { NextResponse } from 'next/server';
import { RegulatoryComplianceEngine } from '@/lib/regulatory/RegulatoryComplianceEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const engine = RegulatoryComplianceEngine.getInstance();

    if (body.action === 'GENERATE') {
      const result = engine.generateReport({
        obligationId: body.obligationId,
        preparerEmail: body.preparerEmail || 'compliance.analyst@koriepay.ng',
        dataSnapshot: body.dataSnapshot || { generatedAt: new Date().toISOString() },
      });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, report: result.report });
    }

    if (body.action === 'APPROVE') {
      const result = engine.approveReport(body.reportId, body.approverEmail || 'chief.compliance@koriepay.com');
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, report: result.report });
    }

    if (body.action === 'SUBMIT') {
      const result = engine.submitReport(body.reportId);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, report: result.report });
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
