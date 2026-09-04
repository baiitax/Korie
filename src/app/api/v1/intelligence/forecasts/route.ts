import { NextRequest, NextResponse } from 'next/server';
import { FinancialForecastingEngine } from '@/lib/intelligence/FinancialForecastingEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = FinancialForecastingEngine.getInstance();
    const forecasts = engine.getForecasts();

    return NextResponse.json({
      success: true,
      data: forecasts,
      count: forecasts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
