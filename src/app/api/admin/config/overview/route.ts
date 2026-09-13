import { NextRequest, NextResponse } from 'next/server';
import { AdminConfigurationEngine, AdminConfigurationEngineError } from '@/lib/admin/AdminConfigurationEngine';
import { adminApiGuard } from '@/lib/security/apiGuards';

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const guard = await adminApiGuard(_req, 'read');
  if (!guard.ok) return guard.response;
  try {
    const engine = AdminConfigurationEngine.getInstance();
    const gateway = engine.getGateway();
    return NextResponse.json(gateway.createResponse(engine.getOverview()));
  } catch (err: unknown) {
    const gateway = AdminConfigurationEngine.getInstance().getGateway();
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof AdminConfigurationEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof AdminConfigurationEngineError ? err.httpStatus : 500;
    return NextResponse.json(gateway.createError(code, message), { status });
  }
}
