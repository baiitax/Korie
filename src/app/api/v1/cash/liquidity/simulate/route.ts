import { NextRequest, NextResponse } from 'next/server';
import { CashForecastingEngine } from '@/lib/cash/CashForecastingEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const engine = CashForecastingEngine.getInstance();
    const result = engine.runScenarioSimulation(body.scenarioCode || 'BASE_BASELINE');

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
