import { NextResponse } from 'next/server';
import { TransactionRecoveryEngine } from '@/lib/recovery/TransactionRecoveryEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const engine = TransactionRecoveryEngine.getInstance();

    const result = await engine.queryProviderStatus({
      caseId: body.caseId,
      transactionReference: body.transactionReference,
      providerId: body.providerId || 'Providus NIP Node',
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
