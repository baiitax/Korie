import { NextRequest, NextResponse } from 'next/server';
import { ModelGovernanceEngine } from '@/lib/intelligence/ModelGovernanceEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = ModelGovernanceEngine.getInstance();
    const models = engine.getModels();
    const killSwitches = engine.getKillSwitches();

    return NextResponse.json({
      success: true,
      data: {
        models,
        killSwitches,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
