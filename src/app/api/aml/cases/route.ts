import { NextResponse } from 'next/server';
import { AmlCaseManagementEngine } from '@/lib/aml/AmlCaseManagementEngine';

export async function GET(request: Request) {
  try {
    const engine = AmlCaseManagementEngine.getInstance();
    const cases = engine.getCases();

    return NextResponse.json({
      success: true,
      data: {
        cases,
        total: cases.length,
        open: cases.filter((c) => c.status !== 'CLOSED').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
