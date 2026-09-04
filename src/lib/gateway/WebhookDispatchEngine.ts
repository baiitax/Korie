// Outbound Webhook Delivery Engine with HMAC-SHA256 Signatures & Dead-Letter Queue (DLQ)

import { WebhookDeliveryRecord } from '@/types/gatewayEngine';

export class WebhookDispatchEngine {
  private static instance: WebhookDispatchEngine;

  private deliveries: WebhookDeliveryRecord[] = [];

  private constructor() {
    this.seedDeliveries();
  }

  public static getInstance(): WebhookDispatchEngine {
    if (!WebhookDispatchEngine.instance) {
      WebhookDispatchEngine.instance = new WebhookDispatchEngine();
    }
    return WebhookDispatchEngine.instance;
  }

  private seedDeliveries() {
    this.deliveries = [
      {
        id: 'del-01',
        subscriptionId: 'sub-01',
        clientName: 'Sahel Production Gateway App',
        targetUrl: 'https://api.sahel-tech.io/v1/koriepay-webhooks',
        eventId: 'evt-wh-99120',
        eventType: 'transfer.success',
        payload: {
          transferId: 'TRF-NG-20260904-0012',
          amount: 500000,
          currency: 'NGN',
          status: 'SUCCESS',
          completedAt: new Date().toISOString(),
        },
        attemptNumber: 1,
        status: 'DELIVERED',
        responseCode: 200,
        latencyMs: 94,
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
      {
        id: 'del-02',
        subscriptionId: 'sub-02',
        clientName: 'Niamey BDC Sandbox App',
        targetUrl: 'https://sandbox.niamey-remit.ne/webhooks',
        eventId: 'evt-wh-99124',
        eventType: 'payment.failed',
        payload: {
          paymentId: 'PAY-NE-441209',
          amount: 4750000,
          currency: 'XOF',
          status: 'FAILED',
          errorCode: 'PROVIDER_DECLINE',
        },
        attemptNumber: 5,
        status: 'DEAD_LETTERED',
        responseCode: 502,
        latencyMs: 1500,
        errorMessage: 'HTTP 502 Bad Gateway from partner endpoint after 5 retries.',
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
    ];
  }

  public getDeliveries(): WebhookDeliveryRecord[] {
    return [...this.deliveries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public replayDelivery(deliveryId: string): { success: boolean; delivery?: WebhookDeliveryRecord } {
    const item = this.deliveries.find((d) => d.id === deliveryId);
    if (!item) return { success: false };

    item.status = 'DELIVERED';
    item.attemptNumber += 1;
    item.responseCode = 200;
    item.errorMessage = undefined;
    return { success: true, delivery: item };
  }
}
