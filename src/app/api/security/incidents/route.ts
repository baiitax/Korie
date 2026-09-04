import { NextResponse } from 'next/server';
import { SecurityIncidentEngine } from '@/lib/iam/SecurityIncidentEngine';

export async function GET(request: Request) {
  try {
    const engine = SecurityIncidentEngine.getInstance();
    const incidents = engine.getIncidents();

    return NextResponse.json({
      success: true,
      data: {
        incidents,
        total: incidents.length,
        active: incidents.filter((i) => i.status !== 'CLOSED').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
