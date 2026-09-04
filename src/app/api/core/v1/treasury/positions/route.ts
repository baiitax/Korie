import { NextRequest } from 'next/server';
import { TreasuryEngine } from '@/lib/treasury/TreasuryEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const currency = (url.searchParams.get('currency') as any) || 'ALL';

    const accounts = TreasuryEngine.getAccounts(currency);
    return ApiResponse.success({
      count: accounts.length,
      accounts,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'TREASURY_POSITIONS_FETCH_ERROR', 500);
  }
}
