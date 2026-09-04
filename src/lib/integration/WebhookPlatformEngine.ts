// Enterprise HMAC Webhook Platform & Delivery Attempt Engine

import { WebhookDeliveryAttempt } from '@/types/integrationEngine';

export class WebhookPlatformEngine {
  private static instance: WebhookPlatformEngine;

  private deliveries: Map<string, WebhookDeliveryAttempt> = new Map();

  private constructor() {
    this.seedDeliveries();
  }

  public static getInstance(): WebhookPlatformEngine {
    if (!WebhookPlatformEngine.instance) {
      WebhookPlatformEngine.instance = new WebhookPlatformEngine();
    }
    return WebhookPlatformEngine.instance;
  }

  private seedDeliveries() {
    const defaultDeliveries: WebhookDeliveryAttempt[] = [
      {
        id: 'del-01',
        subscriptionId: 'sub-01',
        clientName: 'Sahara Automated Payout Service',
        eventId: 'evt-89101',
        eventType: 'payment.succeeded',
        targetUrl: 'https://api.saharagroup.ng/webhooks/koriepay',
        httpStatus: 200,
        latencyMs: 125,
        attemptNumber: 1,
        status: 'DELIVERED',
        createdAt: '2026-09-04T07:15:02Z',
      },
      {
        id: 'del-02',
        subscriptionId: 'sub-02',
        clientName: 'Sahel Grain Trading Enterprise',
        eventId: 'evt-89102',
        eventType: 'transfer.completed',
        targetUrl: 'https://sahelgrain.ne/api/koriepay/callback',
        httpStatus: 504,
        latencyMs: 5002,
        attemptNumber: 5,
        status: 'DEAD_LETTERED',
        errorMessage: 'Connection timed out after 5000ms. Max retries exhausted.',
        createdAt: '2026-09-04T08:05:00Z',
      },
    ];

    defaultDeliveries.forEach((d) => this.deliveries.set(d.id, d));
  }

  public getDeliveries(): WebhookDeliveryAttempt[] {
    return Array.from(this.deliveries.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public replayDelivery(id: string): { success: boolean; delivery?: WebhookDeliveryAttempt } {
    const d = this.deliveries.get(id);
    if (!d) return { success: false };

    d.status = 'DELIVERED';
    d.httpStatus = 200;
    d.latencyMs = 98;
    d.errorMessage = undefined;
    this.deliveries.set(id, d);
    return { success: true, delivery: d };
  }
}
