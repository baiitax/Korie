import { NextRequest, NextResponse } from 'next/server';
import { ProviderConnectivityEngine } from '@/lib/integration/ProviderConnectivityEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'TRIP'; // TRIP or RESET

    const engine = ProviderConnectivityEngine.getInstance();
    const res = action === 'RESET' ? engine.resetCircuitBreaker(code) : engine.tripCircuitBreaker(code);

    if (!res.success) {
      return NextResponse.json({ success: false, error: 'PROVIDER_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: res.provider,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
