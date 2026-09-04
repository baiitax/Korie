import { NextResponse } from 'next/server';
import { TransactionRecoveryEngine } from '@/lib/recovery/TransactionRecoveryEngine';

export async function GET(request: Request) {
  try {
    const engine = TransactionRecoveryEngine.getInstance();
    const cases = engine.getCases();

    return NextResponse.json({
      success: true,
      data: {
        cases,
        total: cases.length,
        unresolved: cases.filter((c) => c.status !== 'RESOLVED' && c.status !== 'FAILED').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
