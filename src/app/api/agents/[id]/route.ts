import { NextResponse } from 'next/server';
import { AgentManagementEngine } from '@/lib/agents/AgentManagementEngine';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const agentEngine = AgentManagementEngine.getInstance();
    const agent = agentEngine.getAgent(params.id);

    if (!agent) {
      return NextResponse.json({ success: false, error: 'AGENT_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true, agent });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const agentEngine = AgentManagementEngine.getInstance();

    if (body.action === 'TRANSITION_STATUS') {
      const result = agentEngine.transitionAgentStatus({
        agentId: params.id,
        newStatus: body.newStatus,
        reasonCode: body.reasonCode || 'ADMIN_ACTION',
        notes: body.notes,
        actorEmail: body.actorEmail || 'admin@koriepay.com',
      });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, agent: result.agent });
    }

    if (body.action === 'UPDATE_LIMITS') {
      const result = agentEngine.updateLimits({
        agentId: params.id,
        dailyLimit: Number(body.dailyLimit),
        singleLimit: Number(body.singleLimit),
        maxCash: Number(body.maxCash),
        actorEmail: body.actorEmail || 'admin@koriepay.com',
      });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, agent: result.agent });
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
