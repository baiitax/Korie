import { NextRequest, NextResponse } from 'next/server';
import { AdminConfigurationEngine, AdminConfigurationEngineError } from '@/lib/admin/AdminConfigurationEngine';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const engine = AdminConfigurationEngine.getInstance();
    const gateway = engine.getGateway();
    const category = new URL(req.url).searchParams.get('category') ?? undefined;
    return NextResponse.json(gateway.createResponse(engine.listConnectors(category)));
  } catch (err: unknown) {
    const gateway = AdminConfigurationEngine.getInstance().getGateway();
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof AdminConfigurationEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof AdminConfigurationEngineError ? err.httpStatus : 500;
    return NextResponse.json(gateway.createError(code, message), { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const engine = AdminConfigurationEngine.getInstance();
    const gateway = engine.getGateway();
    const body = await req.json();
    const data = engine.addConnector(body, body.actor || 'System Administrator');
    return NextResponse.json(gateway.createResponse(data), { status: 201 });
  } catch (err: unknown) {
    const gateway = AdminConfigurationEngine.getInstance().getGateway();
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof AdminConfigurationEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof AdminConfigurationEngineError ? err.httpStatus : 500;
    return NextResponse.json(gateway.createError(code, message), { status });
  }
}
