import { NextResponse } from 'next/server';
import { AmlScenarioEngine } from '@/lib/aml/AmlScenarioEngine';

export async function GET(request: Request) {
  try {
    const engine = AmlScenarioEngine.getInstance();
    const scenarios = engine.getScenarios();

    return NextResponse.json({
      success: true,
      data: {
        scenarios,
        total: scenarios.length,
        active: scenarios.filter((s) => s.isActive).length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
