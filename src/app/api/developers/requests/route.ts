import { NextRequest, NextResponse } from 'next/server';
import { DeveloperWorkspaceEngine, DeveloperWorkspaceEngineError } from '@/lib/developer/DeveloperWorkspaceEngine';

export async function GET(req: NextRequest) {
  const engine = DeveloperWorkspaceEngine.getInstance();
  try {
    const gateway = engine.getGateway();
    const sp = new URL(req.url).searchParams;
    const data = engine.listRequestLogs({
        environment: sp.get('environment') as any ?? undefined,
        status: sp.get('status') ? Number(sp.get('status')) : undefined,
        appId: sp.get('appId') ?? undefined,
        endpoint: sp.get('endpoint') ?? undefined,
      });
    return NextResponse.json(gateway.createResponse(data));
  } catch (err: unknown) {
    const gateway = engine.getGateway();
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof DeveloperWorkspaceEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof DeveloperWorkspaceEngineError ? err.httpStatus : 500;
    return NextResponse.json(gateway.createError(code, message), { status });
  }
}

