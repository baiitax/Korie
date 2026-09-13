import { createHmac, randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptWebhookSecret } from '@/lib/security/webhookSecretCrypto';

/**
 * Real webhook event dispatcher — fires an actual signed HTTP POST to every
 * ACTIVE merchant_webhook_endpoints row subscribed to `eventType`, and
 * records the attempt in merchant_webhook_deliveries. This is the
 * automated workflow counterpart to the manual "Send Test Webhook" button:
 * it is invoked from real transaction/settlement lifecycle events
 * (payment.successful, settlement.completed, etc.) so integrations receive
 * live notifications without any merchant action.
 *
 * Best-effort: dispatch failures never block the caller's main request —
 * they are logged to merchant_webhook_deliveries and swallowed.
 */
export async function dispatchMerchantWebhookEvent(
  admin: SupabaseClient,
  merchantId: string,
  eventType: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: endpoints } = await admin
      .from('merchant_webhook_endpoints')
      .select('id, url, secret_hash, events')
      .eq('merchant_id', merchantId)
      .eq('status', 'ACTIVE');

    for (const endpoint of endpoints || []) {
      const events: string[] = (endpoint as any).events || [];
      if (!events.includes(eventType)) continue;

      const eventId = randomUUID();
      const payload = { event: eventType, eventId, merchantId, sentAt: new Date().toISOString(), data };
      const payloadBody = JSON.stringify(payload);

      // secret_hash stores an AES-256-GCM encrypted signing secret (see
      // webhookSecretCrypto.ts), never plaintext.
      let signingSecret = 'unset';
      try {
        const raw = (endpoint as any).secret_hash;
        if (raw) signingSecret = decryptWebhookSecret(raw);
      } catch {
        // Malformed/legacy value — dispatch continues with an 'unset'
        // secret so the delivery attempt (and its honest FAILED signature
        // mismatch on the merchant's end) is still logged, rather than
        // silently skipping the endpoint or throwing inside a best-effort
        // background dispatcher.
      }
      const signature = createHmac('sha256', signingSecret).update(payloadBody).digest('hex');

      let status: 'DELIVERED' | 'FAILED' = 'FAILED';
      let responseCode: number | null = null;
      let errorMessage: string | null = null;

      try {
        const res = await fetch((endpoint as any).url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-KoriePay-Signature': signature, 'X-KoriePay-Event': eventType },
          body: payloadBody,
          signal: AbortSignal.timeout(8000),
        });
        responseCode = res.status;
        status = res.ok ? 'DELIVERED' : 'FAILED';
        if (!res.ok) errorMessage = `Endpoint responded with HTTP ${res.status}.`;
      } catch (err: any) {
        errorMessage = err?.message || 'Could not reach the webhook URL.';
      }

      await admin.from('merchant_webhook_deliveries').insert({
        endpoint_id: (endpoint as any).id,
        merchant_id: merchantId,
        event_type: eventType,
        payload,
        status,
        response_code: responseCode,
        error_message: errorMessage,
      });

      await admin
        .from('merchant_webhook_endpoints')
        .update({ last_delivery_at: new Date().toISOString(), status: status === 'DELIVERED' ? 'ACTIVE' : 'FAILING' })
        .eq('id', (endpoint as any).id);
    }
  } catch {
    // Never let webhook dispatch failures affect the primary transaction flow.
  }
}
