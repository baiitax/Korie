import { NextResponse } from 'next/server';
import { PrivilegedAccessEngine } from '@/lib/iam/PrivilegedAccessEngine';
import { SecurityEventPipeline } from '@/lib/iam/SecurityEventPipeline';

export async function GET(request: Request) {
  try {
    const engine = PrivilegedAccessEngine.getInstance();
    const requests = engine.getRequests();

    return NextResponse.json({
      success: true,
      data: {
        requests,
        total: requests.length,
        pending: requests.filter((r) => r.status === 'PENDING').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pam = PrivilegedAccessEngine.getInstance();
    const soc = SecurityEventPipeline.getInstance();

    const req = pam.createJitRequest({
      requesterEmail: body.requesterEmail,
      targetRoleCode: body.targetRoleCode,
      justification: body.justification,
      changeTicketRef: body.changeTicketRef,
      durationMinutes: body.durationMinutes,
    });

    soc.ingestEvent({
      eventType: 'JIT_PRIVILEGE_REQUESTED',
      severity: 'LOW',
      actorId: body.requesterEmail,
      actorType: 'WORKFORCE',
      ipAddress: '105.112.84.12',
      countryCode: 'NG',
      resourceType: 'PRIVILEGED_ROLE',
      resourceId: body.targetRoleCode,
      action: 'REQUEST_ELEVATION',
      result: 'SUCCESS',
      reason: body.justification,
    });

    return NextResponse.json({ success: true, request: req });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
