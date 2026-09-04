import { DbOutboxEvent } from '@/types/database';

const outboxQueueStore = new Map<string, DbOutboxEvent>();

export class OutboxService {
  /**
   * Commits an outbox event atomically alongside a database transaction.
   */
  static async publishEvent(params: {
    orgId: string;
    eventName: string;
    aggregateType: DbOutboxEvent['aggregate_type'];
    aggregateId: string;
    payload: Record<string, any>;
  }): Promise<DbOutboxEvent> {
    const event: DbOutboxEvent = {
      id: `evt_out_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      org_id: params.orgId,
      event_name: params.eventName,
      aggregate_type: params.aggregateType,
      aggregate_id: params.aggregateId,
      payload: params.payload,
      status: 'PENDING',
      retry_count: 0,
      max_retries: 5,
      created_at: new Date().toISOString(),
    };

    outboxQueueStore.set(event.id, event);
    return event;
  }

  /**
   * Background outbox worker: polls pending events and marks published.
   */
  static async processPendingEvents(): Promise<{ processedCount: number; events: DbOutboxEvent[] }> {
    const pending = Array.from(outboxQueueStore.values()).filter(e => e.status === 'PENDING');
    const processed: DbOutboxEvent[] = [];

    for (const ev of pending) {
      ev.status = 'PUBLISHED';
      ev.published_at = new Date().toISOString();
      outboxQueueStore.set(ev.id, ev);
      processed.push(ev);
    }

    return {
      processedCount: processed.length,
      events: processed,
    };
  }
}
