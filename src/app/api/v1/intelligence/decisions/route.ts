import { NextRequest, NextResponse } from 'next/server';
import { DecisionIntelligenceEngine } from '@/lib/intelligence/DecisionIntelligenceEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = DecisionIntelligenceEngine.getInstance();
    const decisions = engine.getDecisions();

    return NextResponse.json({
      success: true,
      data: decisions,
      count: decisions.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
