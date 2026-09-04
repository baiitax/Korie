import { NextRequest, NextResponse } from 'next/server';
import { ModelGovernanceEngine } from '@/lib/intelligence/ModelGovernanceEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { switchTarget, isActive, reason, activatedBy } = body;

    const engine = ModelGovernanceEngine.getInstance();
    const ks = engine.toggleKillSwitch(
      switchTarget || 'ALL_AI_SERVICES',
      Boolean(isActive),
      activatedBy || 'Chief Risk Officer',
      reason || 'Manual emergency governance intervention'
    );

    return NextResponse.json({
      success: true,
      data: ks,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
