import { NextResponse } from 'next/server';
import { WorkforceIamEngine } from '@/lib/iam/WorkforceIamEngine';
import { SecurityEventPipeline } from '@/lib/iam/SecurityEventPipeline';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.email) {
      return NextResponse.json({ success: false, error: 'EMAIL_REQUIRED' }, { status: 400 });
    }

    const iam = WorkforceIamEngine.getInstance();
    const soc = SecurityEventPipeline.getInstance();

    const count = iam.revokeAllSessionsForIdentity(body.email, body.reason || 'EMERGENCY_LOCKOUT');

    soc.ingestEvent({
      eventType: 'IDENTITY_EMERGENCY_LOCKOUT',
      severity: 'HIGH',
      actorId: body.adminEmail || 'super.admin@koriepay.com',
      actorType: 'WORKFORCE',
      ipAddress: '105.112.84.12',
      countryCode: 'NG',
      resourceType: 'WORKFORCE_IDENTITY',
      resourceId: body.email,
      action: 'EMERGENCY_LOCKOUT_ALL_SESSIONS',
      result: 'SUCCESS',
      reason: body.reason || 'Emergency containment triggered',
    });

    return NextResponse.json({ success: true, revokedSessionsCount: count, targetEmail: body.email });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
