import { NextRequest, NextResponse } from 'next/server';
import { RegulatoryObligationEngine } from '@/lib/reporting/RegulatoryObligationEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = RegulatoryObligationEngine.getInstance();
    const obligations = engine.getObligations();

    return NextResponse.json({
      success: true,
      data: obligations,
      count: obligations.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
