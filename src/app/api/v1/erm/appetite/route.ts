import { NextRequest, NextResponse } from 'next/server';
import { RiskAppetiteEngine } from '@/lib/erm/RiskAppetiteEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = RiskAppetiteEngine.getInstance();
    const statements = engine.getStatements();

    return NextResponse.json({
      success: true,
      data: statements,
      count: statements.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
