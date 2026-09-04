import { NextResponse } from 'next/server';
import { PrivilegedAccessEngine } from '@/lib/iam/PrivilegedAccessEngine';
import { SecurityEventPipeline } from '@/lib/iam/SecurityEventPipeline';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pam = PrivilegedAccessEngine.getInstance();
    const soc = SecurityEventPipeline.getInstance();

    const event = pam.activateBreakGlass({
      actorEmail: body.actorEmail || 'super.admin@koriepay.com',
      incidentRef: body.incidentRef || 'INC-EMERGENCY',
      justification: body.justification || 'Emergency system recovery',
    });

    soc.ingestEvent({
      eventType: 'BREAK_GLASS_ACTIVATED',
      severity: 'CRITICAL',
      actorId: body.actorEmail || 'super.admin@koriepay.com',
      actorType: 'WORKFORCE',
      ipAddress: '105.112.84.12',
      countryCode: 'NG',
      resourceType: 'BREAK_GLASS',
      resourceId: event.id,
      action: 'EMERGENCY_OVERRIDE',
      result: 'SUCCESS',
      reason: body.justification,
    });

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
