import { NextResponse } from 'next/server';
import { DeveloperSandboxEngine } from '@/lib/gateway/DeveloperSandboxEngine';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';

export async function POST(request: Request) {
  try {
    const scenarioHeader = request.headers.get('x-simulation-scenario') || 'SUCCESS';
    const sandbox = DeveloperSandboxEngine.getInstance();
    const gateway = ApiGatewayEngine.getInstance();

    const result = sandbox.evaluateSandboxHeader(scenarioHeader);
    return NextResponse.json(gateway.createResponse(result), { status: result.httpStatus });
  } catch (error: any) {
    const gateway = ApiGatewayEngine.getInstance();
    return NextResponse.json(gateway.createError('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
