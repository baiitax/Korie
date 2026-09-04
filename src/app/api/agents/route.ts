import { NextResponse } from 'next/server';
import { AgentManagementEngine } from '@/lib/agents/AgentManagementEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || undefined;
    const status = searchParams.get('status') || undefined;

    const agentEngine = AgentManagementEngine.getInstance();
    const agents = agentEngine.getAgents({ country, status });

    return NextResponse.json({
      success: true,
      data: {
        agents,
        total: agents.length,
        active: agents.filter((a) => a.status === 'ACTIVE').length,
        underReview: agents.filter((a) => a.status === 'UNDER_REVIEW' || a.status === 'SUSPENDED').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const agentEngine = AgentManagementEngine.getInstance();

    const agent = agentEngine.registerAgent(body);
    return NextResponse.json({ success: true, agent });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
