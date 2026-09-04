import { NextRequest, NextResponse } from 'next/server';
import { DataGovernanceEngine } from '@/lib/reporting/DataGovernanceEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = DataGovernanceEngine.getInstance();
    const exports = engine.getExports();

    return NextResponse.json({
      success: true,
      data: exports,
      count: exports.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
