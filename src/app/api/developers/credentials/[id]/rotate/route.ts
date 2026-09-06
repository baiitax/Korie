import { NextRequest, NextResponse } from 'next/server';
import { DeveloperWorkspaceEngine, DeveloperWorkspaceEngineError } from '@/lib/developer/DeveloperWorkspaceEngine';

export async function POST(req: NextRequest) {
  const engine = DeveloperWorkspaceEngine.getInstance();
  try {
    const gateway = engine.getGateway();
    const id = req.url.split('/')[req.url.split('/').length - 2];
    const body = await req.json();
    const result = engine.rotateCredential(id, body.actor || 'Ibrahim Abubakar');
    return NextResponse.json(gateway.createResponse({ credential: result.credential, secretKeyRaw: result.secretKeyRaw }));
  } catch (err: unknown) {
    const gateway = engine.getGateway();
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof DeveloperWorkspaceEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof DeveloperWorkspaceEngineError ? err.httpStatus : 500;
    return NextResponse.json(gateway.createError(code, message), { status });
  }
}

