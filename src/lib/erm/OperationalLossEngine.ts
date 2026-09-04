// Operational Loss Event Tracking & Basel Category Engine

import { OperationalLossRecord } from '@/types/ermEngine';

export class OperationalLossEngine {
  private static instance: OperationalLossEngine;

  private lossEvents: Map<string, OperationalLossRecord> = new Map();

  private constructor() {
    this.seedLossEvents();
  }

  public static getInstance(): OperationalLossEngine {
    if (!OperationalLossEngine.instance) {
      OperationalLossEngine.instance = new OperationalLossEngine();
    }
    return OperationalLossEngine.instance;
  }

  private seedLossEvents() {
    const defaultLosses: OperationalLossRecord[] = [
      {
        id: 'loss-01',
        eventCode: 'LOSS-2026-0815-01',
        title: 'POS Terminal Cash Dispense Mismatch at Alaba Market Agent Outpost',
        category: 'EXECUTION_PROCESS_FAILURE',
        grossLossAmount: 50000,
        recoveredAmount: 50000,
        netLossAmount: 0,
        currency: 'NGN',
        eventDate: '2026-08-15',
        rootCause: 'Paper jam caused terminal timeout; customer refunded and compensating GL suspense balanced.',
        status: 'CLOSED',
        createdAt: '2026-08-15T14:00:00Z',
      },
      {
        id: 'loss-02',
        eventCode: 'LOSS-2026-0902-02',
        title: 'Unauthorized Card Cash-Out Chargeback Settlement Dispute',
        category: 'EXTERNAL_FRAUD',
        grossLossAmount: 120000,
        recoveredAmount: 85000,
        netLossAmount: 35000,
        currency: 'NGN',
        eventDate: '2026-09-02',
        rootCause: 'Stolen debit card used before cardholder report; partial agent indemnity recovery applied.',
        status: 'QUANTIFIED',
        createdAt: '2026-09-02T16:00:00Z',
      },
    ];

    defaultLosses.forEach((l) => this.lossEvents.set(l.id, l));
  }

  public getLossEvents(): OperationalLossRecord[] {
    return Array.from(this.lossEvents.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
