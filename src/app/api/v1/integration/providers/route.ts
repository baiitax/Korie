import { NextRequest, NextResponse } from 'next/server';
import { ProviderConnectivityEngine } from '@/lib/integration/ProviderConnectivityEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = ProviderConnectivityEngine.getInstance();
    const providers = engine.getProviders();

    return NextResponse.json({
      success: true,
      data: providers,
      count: providers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
