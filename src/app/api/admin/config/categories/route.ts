import { NextRequest, NextResponse } from 'next/server';
import { AdminConfigurationEngine, AdminConfigurationEngineError } from '@/lib/admin/AdminConfigurationEngine';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const engine = AdminConfigurationEngine.getInstance();
    return NextResponse.json(engine.getGateway().createResponse(engine.getConnectorCategorySpecs()));
  } catch (err: unknown) {
    const gateway = AdminConfigurationEngine.getInstance().getGateway();
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof AdminConfigurationEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof AdminConfigurationEngineError ? err.httpStatus : 500;
    return NextResponse.json(gateway.createError(code, message), { status });
  }
}
