// Enterprise Transactional Outbox & Event Bus Engine

import { EnterpriseEventOutbox, EnterpriseEventDeadLetter } from '@/types/integrationEngine';

export class EnterpriseEventBusEngine {
  private static instance: EnterpriseEventBusEngine;

  private outbox: Map<string, EnterpriseEventOutbox> = new Map();
  private deadLetters: Map<string, EnterpriseEventDeadLetter> = new Map();

  private constructor() {
    this.seedEvents();
  }

  public static getInstance(): EnterpriseEventBusEngine {
    if (!EnterpriseEventBusEngine.instance) {
      EnterpriseEventBusEngine.instance = new EnterpriseEventBusEngine();
    }
    return EnterpriseEventBusEngine.instance;
  }

  private seedEvents() {
    const defaultEvents: EnterpriseEventOutbox[] = [
      {
        id: 'evt-89101',
        eventType: 'payment.completed.v1',
        eventVersion: 'v1',
        aggregateId: 'tx-ngn-889104',
        aggregateType: 'PAYMENT_TRANSACTION',
        payload: { amount: 5000000, currency: 'NGN', recipientAccount: '0123456789' },
        status: 'PUBLISHED',
        publishedAt: '2026-09-04T07:15:00Z',
        createdAt: '2026-09-04T07:14:59Z',
      },
      {
        id: 'evt-89102',
        eventType: 'settlement.cleared.v1',
        eventVersion: 'v1',
        aggregateId: 'stl-batch-2026-0904',
        aggregateType: 'SETTLEMENT_BATCH',
        payload: { totalVolumeNgn: 450000000, partnerId: 'prt-01' },
        status: 'PUBLISHED',
        publishedAt: '2026-09-04T08:00:00Z',
        createdAt: '2026-09-04T07:59:58Z',
      },
    ];

    const defaultDeadLetters: EnterpriseEventDeadLetter[] = [
      {
        id: 'dlq-01',
        eventId: 'evt-89101',
        consumerName: 'WebhookDispatchWorker',
        failureReason: 'Partner endpoint returned HTTP 500 Internal Server Error after 5 attempts.',
        attemptsCount: 5,
        status: 'DEAD_LETTERED',
        createdAt: '2026-09-04T07:20:00Z',
      },
    ];

    defaultEvents.forEach((e) => this.outbox.set(e.id, e));
    defaultDeadLetters.forEach((d) => this.deadLetters.set(d.id, d));
  }

  public getOutboxEvents(): EnterpriseEventOutbox[] {
    return Array.from(this.outbox.values());
  }

  public getDeadLetters(): EnterpriseEventDeadLetter[] {
    return Array.from(this.deadLetters.values());
  }

  public replayDeadLetter(deadLetterId: string): { success: boolean; event?: EnterpriseEventDeadLetter } {
    const dlq = this.deadLetters.get(deadLetterId);
    if (!dlq) return { success: false };

    dlq.status = 'REPLAYED';
    this.deadLetters.set(deadLetterId, dlq);
    return { success: true, event: dlq };
  }
}
