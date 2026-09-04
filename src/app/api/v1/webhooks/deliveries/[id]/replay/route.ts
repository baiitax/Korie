import { NextResponse } from 'next/server';
import { WebhookDispatchEngine } from '@/lib/gateway/WebhookDispatchEngine';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const engine = WebhookDispatchEngine.getInstance();
    const gateway = ApiGatewayEngine.getInstance();

    const result = engine.replayDelivery(params.id);
    if (!result.success) {
      return NextResponse.json(gateway.createError('DELIVERY_NOT_FOUND', 'Webhook delivery event not found.'), { status: 404 });
    }

    return NextResponse.json(gateway.createResponse({ delivery: result.delivery, message: 'Webhook replayed successfully.' }));
  } catch (error: any) {
    const gateway = ApiGatewayEngine.getInstance();
    return NextResponse.json(gateway.createError('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
