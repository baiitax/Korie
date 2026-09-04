import { NextRequest } from 'next/server';
import { FxPositionEngine } from '@/lib/treasury/FxPositionEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pair = url.searchParams.get('pair') as any;

    if (pair) {
      const position = FxPositionEngine.getPosition(pair);
      if (!position) {
        return ApiResponse.notFound(`FX position for currency pair ${pair} not found.`);
      }
      return ApiResponse.success(position);
    }

    const positions = FxPositionEngine.getAllPositions();
    return ApiResponse.success({
      count: positions.length,
      positions,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'TREASURY_FX_POSITIONS_FETCH_ERROR', 500);
  }
}
