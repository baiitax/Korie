import { NextResponse } from 'next/server';
import { PrivilegedAccessEngine } from '@/lib/iam/PrivilegedAccessEngine';
import { SecurityEventPipeline } from '@/lib/iam/SecurityEventPipeline';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const pam = PrivilegedAccessEngine.getInstance();
    const soc = SecurityEventPipeline.getInstance();

    const result = pam.approveJitRequest(
      params.id,
      body.checkerEmail || 'super.admin@koriepay.com'
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    soc.ingestEvent({
      eventType: 'JIT_PRIVILEGE_APPROVED',
      severity: 'MEDIUM',
      actorId: body.checkerEmail || 'super.admin@koriepay.com',
      actorType: 'WORKFORCE',
      ipAddress: '105.112.84.12',
      countryCode: 'NG',
      resourceType: 'JIT_REQUEST',
      resourceId: params.id,
      action: 'APPROVE_ELEVATION',
      result: 'SUCCESS',
      reason: `Dual-authorization sign-off for ${result.request?.targetRoleCode}`,
    });

    return NextResponse.json({ success: true, request: result.request });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
