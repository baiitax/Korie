import { NextResponse } from 'next/server';
import { WorkforceIamEngine } from '@/lib/iam/WorkforceIamEngine';

export async function GET(request: Request) {
  try {
    const engine = WorkforceIamEngine.getInstance();
    const identity = engine.getIdentity('super.admin@koriepay.com');

    return NextResponse.json({
      success: true,
      data: {
        actor: identity,
        assuranceLevel: 'AAL3',
        activeSessionsCount: engine.getSessions('super.admin@koriepay.com').length,
        deviceTrust: 'TRUSTED',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
