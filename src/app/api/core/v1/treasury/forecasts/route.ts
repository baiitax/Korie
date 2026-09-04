import { NextRequest } from 'next/server';
import { LiquidityForecastingEngine } from '@/lib/treasury/LiquidityForecastingEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const currency = (url.searchParams.get('currency') as any) || 'NGN';

    const forecasts = LiquidityForecastingEngine.generateForecasts(currency);
    return ApiResponse.success({
      count: forecasts.length,
      forecasts,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'TREASURY_FORECASTS_FETCH_ERROR', 500);
  }
}
