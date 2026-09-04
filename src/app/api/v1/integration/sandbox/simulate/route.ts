import { NextRequest, NextResponse } from 'next/server';
import { DeveloperSandboxEngine } from '@/lib/integration/DeveloperSandboxEngine';
import { SandboxScenario } from '@/types/integrationEngine';

export async function POST(req: NextRequest) {
  try {
    const scenarioHeader = req.headers.get('x-simulation-scenario') as SandboxScenario || 'SUCCESS';
    const body = await req.json().catch(() => ({}));

    const engine = DeveloperSandboxEngine.getInstance();
    const result = engine.simulate(scenarioHeader, body);

    return NextResponse.json(result, { status: result.httpStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
