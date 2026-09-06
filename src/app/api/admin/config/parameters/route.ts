import { NextRequest, NextResponse } from 'next/server';
import { AdminConfigurationEngine, AdminConfigurationEngineError } from '@/lib/admin/AdminConfigurationEngine';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const engine = AdminConfigurationEngine.getInstance();
    return NextResponse.json(engine.getGateway().createResponse(engine.getParameters()));
  } catch (err: unknown) {
    const gateway = AdminConfigurationEngine.getInstance().getGateway();
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof AdminConfigurationEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof AdminConfigurationEngineError ? err.httpStatus : 500;
    return NextResponse.json(gateway.createError(code, message), { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const engine = AdminConfigurationEngine.getInstance();
    const gateway = engine.getGateway();
    const body = await req.json();
    const data = engine.updateParameters(body.values || {}, body.actor || 'System Administrator');
    return NextResponse.json(gateway.createResponse(data));
  } catch (err: unknown) {
    const gateway = AdminConfigurationEngine.getInstance().getGateway();
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof AdminConfigurationEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof AdminConfigurationEngineError ? err.httpStatus : 500;
    return NextResponse.json(gateway.createError(code, message), { status });
  }
}
