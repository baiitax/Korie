import { NextRequest, NextResponse } from 'next/server';
import { IssueRemediationEngine } from '@/lib/erm/IssueRemediationEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = IssueRemediationEngine.getInstance();
    const issues = engine.getIssues();

    return NextResponse.json({
      success: true,
      data: issues,
      count: issues.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
