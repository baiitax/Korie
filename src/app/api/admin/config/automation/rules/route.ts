import { NextRequest, NextResponse } from 'next/server';
import { AdminConfigurationEngine, AdminConfigurationEngineError } from '@/lib/admin/AdminConfigurationEngine';
import { adminApiGuard } from '@/lib/security/apiGuards';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await adminApiGuard(req, 'read');
  if (!guard.ok) return guard.response;
  try {
    const engine = AdminConfigurationEngine.getInstance();
    return NextResponse.json(engine.getGateway().createResponse(engine.listRules()));
  } catch (err: unknown) {
    const gateway = AdminConfigurationEngine.getInstance().getGateway();
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof AdminConfigurationEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof AdminConfigurationEngineError ? err.httpStatus : 500;
    return NextResponse.json(gateway.createError(code, message), { status });
  }
}

export async function POST(req: NextRequest) {
  const guard = await adminApiGuard(req, 'write');
  if (!guard.ok) return guard.response;
  try {
    const engine = AdminConfigurationEngine.getInstance();
    const gateway = engine.getGateway();
    const body = await req.json();
    const data = engine.addRule(body, body.actor || 'System Administrator');
    return NextResponse.json(gateway.createResponse(data), { status: 201 });
  } catch (err: unknown) {
    const gateway = AdminConfigurationEngine.getInstance().getGateway();
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof AdminConfigurationEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof AdminConfigurationEngineError ? err.httpStatus : 500;
    return NextResponse.json(gateway.createError(code, message), { status });
  }
}
