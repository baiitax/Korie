import { NextRequest } from 'next/server';
import { createSuccessResponse } from '@/lib/security/apiResponse';
import { OutboxService } from '@/lib/services/OutboxService';

export async function POST(req: NextRequest) {
  const result = await OutboxService.processPendingEvents();

  return createSuccessResponse({
    dispatched_count: result.processedCount,
    processed_events: result.events.map(e => ({
      id: e.id,
      event_name: e.event_name,
      status: e.status,
    })),
    dispatched_at: new Date().toISOString(),
  }, {
    code: 'OUTBOX_DISPATCH_COMPLETE',
    message: 'Pending outbox events processed successfully.',
    requestId: `KP-OUTBOX-${Date.now()}`,
    environment: 'PRODUCTION',
  });
}
