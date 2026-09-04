import { NextResponse } from 'next/server';
import { ProviderConnectivityEngine } from '@/lib/gateway/ProviderConnectivityEngine';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';

export async function GET(request: Request) {
  try {
    const engine = ProviderConnectivityEngine.getInstance();
    const gateway = ApiGatewayEngine.getInstance();

    const providers = engine.getProviders();
    return NextResponse.json(gateway.createResponse({ providers, total: providers.length }));
  } catch (error: any) {
    const gateway = ApiGatewayEngine.getInstance();
    return NextResponse.json(gateway.createError('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
