import { NextResponse } from 'next/server';
import { TransactionRecoveryEngine } from '@/lib/recovery/TransactionRecoveryEngine';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const engine = TransactionRecoveryEngine.getInstance();
    const caseRecord = engine.getCase(params.id);

    if (!caseRecord) {
      return NextResponse.json({ success: false, error: 'CASE_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true, case: caseRecord });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
