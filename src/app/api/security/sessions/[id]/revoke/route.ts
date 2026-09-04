import { NextResponse } from 'next/server';
import { WorkforceIamEngine } from '@/lib/iam/WorkforceIamEngine';
import { SecurityEventPipeline } from '@/lib/iam/SecurityEventPipeline';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const iam = WorkforceIamEngine.getInstance();
    const soc = SecurityEventPipeline.getInstance();

    const success = iam.revokeSession(params.id, body.reason || 'ADMINISTRATIVE_REVOCATION');

    if (!success) {
      return NextResponse.json({ success: false, error: 'SESSION_NOT_FOUND' }, { status: 404 });
    }

    soc.ingestEvent({
      eventType: 'SESSION_REVOKED',
      severity: 'INFO',
      actorId: body.adminEmail || 'super.admin@koriepay.com',
      actorType: 'WORKFORCE',
      sessionId: params.id,
      ipAddress: '105.112.84.12',
      countryCode: 'NG',
      resourceType: 'SESSION',
      resourceId: params.id,
      action: 'REVOKE',
      result: 'SUCCESS',
      reason: body.reason || 'Terminated via Security Command Center',
    });

    return NextResponse.json({ success: true, sessionId: params.id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
