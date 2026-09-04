import { NextRequest, NextResponse } from 'next/server';
import { ThreeStatementPlanningEngine } from '@/lib/treasury/ThreeStatementPlanningEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const version = (searchParams.get('version') as any) || 'BASE_CASE';
    const currency = (searchParams.get('currency') as 'NGN' | 'XOF') || 'NGN';

    const engine = ThreeStatementPlanningEngine.getInstance();
    const forecast = engine.getForecast(version, currency);

    return NextResponse.json({
      success: true,
      data: forecast,
      count: forecast.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
