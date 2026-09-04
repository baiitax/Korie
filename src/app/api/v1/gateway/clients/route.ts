import { NextResponse } from 'next/server';
import { PartnerManagementEngine } from '@/lib/gateway/PartnerManagementEngine';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partnerId') || undefined;

    const engine = PartnerManagementEngine.getInstance();
    const gateway = ApiGatewayEngine.getInstance();

    const clients = engine.getClients(partnerId);
    return NextResponse.json(gateway.createResponse({ clients, total: clients.length }));
  } catch (error: any) {
    const gateway = ApiGatewayEngine.getInstance();
    return NextResponse.json(gateway.createError('INTERNAL_ERROR', error.message), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const engine = PartnerManagementEngine.getInstance();
    const gateway = ApiGatewayEngine.getInstance();

    const client = engine.createClient({
      partnerId: body.partnerId,
      clientName: body.clientName,
      environment: body.environment || 'SANDBOX',
      allowedScopes: body.allowedScopes || ['payments:read', 'transfers:write'],
      rateLimitPerSecond: body.rateLimitPerSecond || 50,
    });

    return NextResponse.json(gateway.createResponse({ client }));
  } catch (error: any) {
    const gateway = ApiGatewayEngine.getInstance();
    return NextResponse.json(gateway.createError('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
