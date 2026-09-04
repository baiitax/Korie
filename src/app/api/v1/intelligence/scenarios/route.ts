import { NextRequest, NextResponse } from 'next/server';
import { ScenarioSimulationEngine } from '@/lib/intelligence/ScenarioSimulationEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const engine = ScenarioSimulationEngine.getInstance();
    const result = engine.simulateScenario(body);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
