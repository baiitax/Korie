import { NextResponse } from 'next/server';
import { PeriodCloseEngine } from '@/lib/financial/PeriodCloseEngine';

export async function GET(request: Request) {
  try {
    const periodCloseEngine = PeriodCloseEngine.getInstance();
    const checklist = periodCloseEngine.getChecklist();

    return NextResponse.json({
      success: true,
      data: {
        checklist,
        totalSteps: checklist.length,
        completedSteps: checklist.filter((s) => s.status === 'COMPLETED').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const periodCloseEngine = PeriodCloseEngine.getInstance();

    const result = periodCloseEngine.executeStep(body.stepNumber, body.operatorEmail || 'controller@koriepay.com');
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, step: result.step });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
