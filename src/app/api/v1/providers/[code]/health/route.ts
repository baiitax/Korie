import { NextResponse } from 'next/server';
import { ProviderConnectivityEngine } from '@/lib/gateway/ProviderConnectivityEngine';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const body = await request.json();
    const engine = ProviderConnectivityEngine.getInstance();
    const gateway = ApiGatewayEngine.getInstance();

    engine.updateHealth(
      params.code,
      body.health || 'HEALTHY',
      body.latencyMs || 120
    );

    const provider = engine.getProvider(params.code);
    return NextResponse.json(gateway.createResponse({ provider }));
  } catch (error: any) {
    const gateway = ApiGatewayEngine.getInstance();
    return NextResponse.json(gateway.createError('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
