import { NextRequest, NextResponse } from 'next/server';
import { AgentManagementEngine } from '@/lib/agents/AgentManagementEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get('country') || undefined;
    const status = searchParams.get('status') || undefined;

    const engine = AgentManagementEngine.getInstance();
    const agents = engine.getAgents({ country, status });

    return NextResponse.json({
      success: true,
      data: agents,
      count: agents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
