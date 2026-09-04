import { NextRequest, NextResponse } from 'next/server';
import { ApiGatewayRouterEngine } from '@/lib/integration/ApiGatewayRouterEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = ApiGatewayRouterEngine.getInstance();
    const routes = engine.getRoutes();

    return NextResponse.json({
      success: true,
      data: routes,
      count: routes.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
