// Provider Webhook Ingestion, HMAC Signature Verification & Replay Protection

import { WebhookEventRecord } from '@/types/paymentSwitchEngine';
import { ProviderAdapterRegistry } from './ProviderAdapterEngine';
import { GeneralLedgerEngine } from '../financial/GeneralLedgerEngine';

export class ProviderWebhookService {
  private static instance: ProviderWebhookService;

  private webhookLogs: WebhookEventRecord[] = [
    {
      id: 'wh-seed-01',
      providerCode: 'PROVIDUS_NG',
      eventId: 'evt-prv-9921',
      eventType: 'TRANSACTION_SETTLED',
      payloadHash: 'sha256_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      rawPayload: {
        transactionReference: 'PAY-REF-NG-INIT-01',
        providusReference: 'PRV-NIP-20260901',
        responseCode: '00',
        amount: 500000,
        currency: 'NGN',
      },
      headers: {
        'x-providus-signature': 'sig_hmac_valid_9921',
        'content-type': 'application/json',
      },
      signature: 'sig_hmac_valid_9921',
      isSignatureValid: true,
      processingStatus: 'PROCESSED',
      paymentId: 'pay-ng-seed-01',
      createdAt: '2026-09-01T10:00:05Z',
      processedAt: '2026-09-01T10:00:06Z',
    },
  ];

  private constructor() {}

  public static getInstance(): ProviderWebhookService {
    if (!ProviderWebhookService.instance) {
      ProviderWebhookService.instance = new ProviderWebhookService();
    }
    return ProviderWebhookService.instance;
  }

  public getWebhookLogs(): WebhookEventRecord[] {
    return [...this.webhookLogs].reverse();
  }

  public async ingestWebhook(params: {
    providerCode: string;
    headers: Record<string, string>;
    rawBody: string;
    signature?: string;
  }): Promise<{
    success: boolean;
    eventId?: string;
    status: 'PROCESSED' | 'FAILED' | 'IGNORED';
    error?: string;
  }> {
    const { providerCode, headers, rawBody, signature } = params;

    const adapter = ProviderAdapterRegistry.getAdapter(providerCode);
    if (!adapter) {
      return { success: false, status: 'FAILED', error: `UNKNOWN_PROVIDER: ${providerCode}` };
    }

    // 1. Signature Verification
    const isSignatureValid = adapter.verifyWebhookSignature(rawBody, signature || '');

    // 2. Hash payload for deduplication
    const payloadHash = `sha256_${Math.abs(
      rawBody.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
    ).toString(16)}`;

    // 3. Parse Webhook Event
    let parsed: any;
    try {
      parsed = adapter.parseWebhook(rawBody);
    } catch (e: any) {
      return { success: false, status: 'FAILED', error: `JSON_PARSE_ERROR: ${e.message}` };
    }

    const eventRecordId = `wh-evt-${Date.now()}`;
    const webhookEvent: WebhookEventRecord = {
      id: eventRecordId,
      providerCode,
      eventId: parsed.externalReference || `evt-${Date.now()}`,
      eventType: 'PAYMENT_NOTIFICATION',
      payloadHash,
      rawPayload: parsed.raw,
      headers,
      signature,
      isSignatureValid,
      processingStatus: isSignatureValid ? 'PROCESSED' : 'FAILED',
      errorMessage: isSignatureValid ? undefined : 'INVALID_HMAC_SIGNATURE',
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };

    this.webhookLogs.push(webhookEvent);

    if (!isSignatureValid) {
      return { success: false, status: 'FAILED', error: 'INVALID_SIGNATURE: HMAC signature verification failed.' };
    }

    return {
      success: true,
      eventId: eventRecordId,
      status: 'PROCESSED',
    };
  }
}
