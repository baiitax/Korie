import { NextRequest, NextResponse } from 'next/server';
import { DeveloperWorkspaceEngine, DeveloperWorkspaceEngineError } from '@/lib/developer/DeveloperWorkspaceEngine';

export async function GET(req: NextRequest) {
  const engine = DeveloperWorkspaceEngine.getInstance();
  try {
    const gateway = engine.getGateway();
    const sp = new URL(req.url).searchParams;
    const data = engine.listCredentials(sp.get('environment') as any ?? undefined);
    return NextResponse.json(gateway.createResponse(data));
  } catch (err: unknown) {
    const gateway = engine.getGateway();
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof DeveloperWorkspaceEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof DeveloperWorkspaceEngineError ? err.httpStatus : 500;
    return NextResponse.json(gateway.createError(code, message), { status });
  }
}

export async function POST(req: NextRequest) {
  const engine = DeveloperWorkspaceEngine.getInstance();
  try {
    const gateway = engine.getGateway();
    const body = await req.json();
    const result = engine.createCredential({ appId: body.appId, name: body.name, environment: body.environment, scopes: body.scopes }, body.actor || 'Ibrahim Abubakar');
    return NextResponse.json(gateway.createResponse({ credential: result.credential, secretKeyRaw: result.secretKeyRaw }), { status: 201 });
  } catch (err: unknown) {
    const gateway = engine.getGateway();
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof DeveloperWorkspaceEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof DeveloperWorkspaceEngineError ? err.httpStatus : 500;
    return NextResponse.json(gateway.createError(code, message), { status });
  }
}

