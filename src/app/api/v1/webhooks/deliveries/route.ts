import { NextResponse } from 'next/server';
import { WebhookDispatchEngine } from '@/lib/gateway/WebhookDispatchEngine';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';

export async function GET(request: Request) {
  try {
    const engine = WebhookDispatchEngine.getInstance();
    const gateway = ApiGatewayEngine.getInstance();

    const deliveries = engine.getDeliveries();
    return NextResponse.json(gateway.createResponse({ deliveries, total: deliveries.length }));
  } catch (error: any) {
    const gateway = ApiGatewayEngine.getInstance();
    return NextResponse.json(gateway.createError('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
