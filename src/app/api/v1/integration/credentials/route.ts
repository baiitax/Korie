import { NextRequest, NextResponse } from 'next/server';
import { ApiGatewayRouterEngine } from '@/lib/integration/ApiGatewayRouterEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = ApiGatewayRouterEngine.getInstance();
    const credentials = engine.getCredentials();

    return NextResponse.json({
      success: true,
      data: credentials,
      count: credentials.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const engine = ApiGatewayRouterEngine.getInstance();
    const cred = engine.createCredential(body);

    return NextResponse.json({
      success: true,
      data: cred,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
