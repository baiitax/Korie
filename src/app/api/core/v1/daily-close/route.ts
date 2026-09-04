import { NextRequest } from 'next/server';
import { DailyCloseEngine } from '@/lib/financial/DailyCloseEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { closeDate, operator } = body;

    const record = DailyCloseEngine.executeDailyClose(closeDate, operator || 'FINANCE_ADMIN');

    return ApiResponse.success(record, `Financial daily close for ${record.closeDate} executed successfully.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'DAILY_CLOSE_EXECUTION_ERROR', 400);
  }
}

export async function GET(req: NextRequest) {
  try {
    const history = DailyCloseEngine.getCloseHistory();
    return ApiResponse.success({
      count: history.length,
      history,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'DAILY_CLOSE_FETCH_ERROR', 500);
  }
}
