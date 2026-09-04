import { NextRequest } from 'next/server';
import { TreasuryEngine } from '@/lib/treasury/TreasuryEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const alerts = TreasuryEngine.getAlerts();
    return ApiResponse.success({
      count: alerts.length,
      alerts,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'TREASURY_ALERTS_FETCH_ERROR', 500);
  }
}
