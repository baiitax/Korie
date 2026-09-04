import { NextResponse } from 'next/server';
import { ProviderWebhookService } from '@/lib/paymentSwitch/ProviderWebhookService';

export async function POST(
  request: Request,
  { params }: { params: { provider: string } }
) {
  try {
    const providerCode = params.provider.toUpperCase();
    const rawBody = await request.text();
    
    // Extract headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const signature =
      headers['x-auth-signature'] ||
      headers['x-providus-signature'] ||
      headers['x-koris-signature'] ||
      headers['x-interswitch-signature'] ||
      headers['signature'];

    const webhookService = ProviderWebhookService.getInstance();
    const result = await webhookService.ingestWebhook({
      providerCode,
      headers,
      rawBody,
      signature,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 401 });
    }

    return NextResponse.json({ success: true, eventId: result.eventId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
