import { NextRequest, NextResponse } from 'next/server';
import { AdminConfigurationEngine, AdminConfigurationEngineError } from '@/lib/admin/AdminConfigurationEngine';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const engine = AdminConfigurationEngine.getInstance();
    const gateway = engine.getGateway();
    const sp = new URL(req.url).searchParams;
    const data = engine.listAudit(sp.get('kind') ?? 'ALL', sp.get('limit') ? Number(sp.get('limit')) : 50);
    return NextResponse.json(gateway.createResponse(data));
  } catch (err: unknown) {
    const gateway = AdminConfigurationEngine.getInstance().getGateway();
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof AdminConfigurationEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof AdminConfigurationEngineError ? err.httpStatus : 500;
    return NextResponse.json(gateway.createError(code, message), { status });
  }
}
