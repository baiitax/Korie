import { NextResponse } from 'next/server';
import { RegulatoryComplianceEngine } from '@/lib/regulatory/RegulatoryComplianceEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jurisdiction = searchParams.get('jurisdiction') || undefined;

    const engine = RegulatoryComplianceEngine.getInstance();
    const obligations = engine.getObligations(jurisdiction);
    const reports = engine.getReports();

    return NextResponse.json({
      success: true,
      data: {
        obligations,
        reports,
        totalObligations: obligations.length,
        submittedReports: reports.filter((r) => r.status === 'SUBMITTED').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
