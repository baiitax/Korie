import { NextRequest } from 'next/server';
import { DeadLetterQueueEngine } from '@/lib/resilience/DeadLetterQueueEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { operator } = body;

    const replayed = DeadLetterQueueEngine.replayJob(params.id, operator || 'RECOVERY_OPERATOR');
    return ApiResponse.success(replayed, `Dead-letter task [${replayed.jobKey}] replayed successfully with idempotency preservation.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'DLQ_REPLAY_ERROR', 400);
  }
}
