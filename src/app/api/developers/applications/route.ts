export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { DeveloperWorkspaceEngine, DeveloperWorkspaceEngineError } from '@/lib/developer/DeveloperWorkspaceEngine';

export async function GET(req: NextRequest) {
  const engine = DeveloperWorkspaceEngine.getInstance();
  try {
    const gateway = engine.getGateway();
    const data = engine.listApplications();
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
    const data = engine.createApplication({ name: body.name, description: body.description }, body.actor || 'Ibrahim Abubakar');
    return NextResponse.json(gateway.createResponse(data), { status: 201 });
  } catch (err: unknown) {
    const gateway = engine.getGateway();
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof DeveloperWorkspaceEngineError ? err.code : 'INTERNAL_ERROR';
    const status = err instanceof DeveloperWorkspaceEngineError ? err.httpStatus : 500;
    return NextResponse.json(gateway.createError(code, message), { status });
  }
}

