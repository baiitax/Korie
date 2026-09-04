import { NextRequest, NextResponse } from 'next/server';
import { CashForecastingEngine } from '@/lib/cash/CashForecastingEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currency = (searchParams.get('currency') as 'NGN' | 'XOF') || 'NGN';

    const engine = CashForecastingEngine.getInstance();
    const forecasts = engine.getForecasts(currency);

    return NextResponse.json({
      success: true,
      data: forecasts,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
