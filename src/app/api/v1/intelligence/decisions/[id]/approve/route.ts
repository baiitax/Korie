import { NextRequest, NextResponse } from 'next/server';
import { DecisionIntelligenceEngine } from '@/lib/intelligence/DecisionIntelligenceEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const engine = DecisionIntelligenceEngine.getInstance();
    const res = engine.approveDecision(id);

    if (!res.success) {
      return NextResponse.json({ success: false, error: 'DECISION_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: res.decision,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
