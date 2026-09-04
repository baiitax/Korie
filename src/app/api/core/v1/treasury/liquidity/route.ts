import { NextRequest } from 'next/server';
import { TreasuryEngine } from '@/lib/treasury/TreasuryEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const currency = (url.searchParams.get('currency') as any) || 'NGN';

    const liquidity = TreasuryEngine.calculateAvailableLiquidity(currency);
    return ApiResponse.success(liquidity);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'TREASURY_LIQUIDITY_FETCH_ERROR', 500);
  }
}
