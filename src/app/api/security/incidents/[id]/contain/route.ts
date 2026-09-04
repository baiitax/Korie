import { NextResponse } from 'next/server';
import { SecurityIncidentEngine } from '@/lib/iam/SecurityIncidentEngine';
import { SecurityEventPipeline } from '@/lib/iam/SecurityEventPipeline';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const engine = SecurityIncidentEngine.getInstance();
    const soc = SecurityEventPipeline.getInstance();

    const result = engine.executeContainment({
      incidentId: params.id,
      targetEmail: body.targetEmail,
      action: body.action || 'REVOKE_SESSIONS',
      commanderEmail: body.commanderEmail || 'ciso@koriepay.com',
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: 'CONTAINMENT_FAILED' }, { status: 400 });
    }

    soc.ingestEvent({
      eventType: 'INCIDENT_CONTAINMENT_EXECUTED',
      severity: 'HIGH',
      actorId: body.commanderEmail || 'ciso@koriepay.com',
      actorType: 'WORKFORCE',
      ipAddress: '105.112.84.12',
      countryCode: 'NG',
      resourceType: 'SECURITY_INCIDENT',
      resourceId: params.id,
      action: body.action || 'REVOKE_SESSIONS',
      result: 'SUCCESS',
      reason: `Automated containment against ${body.targetEmail}`,
    });

    return NextResponse.json({
      success: true,
      incident: result.incident,
      revokedCount: result.revokedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
