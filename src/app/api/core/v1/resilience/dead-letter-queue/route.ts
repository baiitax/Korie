import { NextRequest } from 'next/server';
import { DeadLetterQueueEngine } from '@/lib/resilience/DeadLetterQueueEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const jobs = DeadLetterQueueEngine.getAllJobs();
    return ApiResponse.success({
      count: jobs.length,
      jobs,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'DLQ_FETCH_ERROR', 500);
  }
}
