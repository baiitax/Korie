import { NextResponse } from 'next/server';
import { CustomerHarmIncidentEngine } from '@/lib/consumer/CustomerHarmIncidentEngine';

export async function GET(request: Request) {
  try {
    const engine = CustomerHarmIncidentEngine.getInstance();
    const incidents = engine.getIncidents();

    return NextResponse.json({
      success: true,
      data: {
        incidents,
        total: incidents.length,
        open: incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'POSTMORTEM_PUBLISHED').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const engine = CustomerHarmIncidentEngine.getInstance();

    if (body.action === 'UPDATE_STATUS') {
      const result = engine.updateIncidentStatus({
        incidentId: body.incidentId,
        status: body.status,
        rootCause: body.rootCause,
        remediationPlan: body.remediationPlan,
      });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, incident: result.incident });
    }

    const incident = engine.createIncident(body);
    return NextResponse.json({ success: true, incident });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
