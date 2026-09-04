import { NextRequest, NextResponse } from 'next/server';
import { EnterpriseAiCopilotEngine } from '@/lib/intelligence/EnterpriseAiCopilotEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const engine = EnterpriseAiCopilotEngine.getInstance();
    const res = engine.processQuery(body);

    return NextResponse.json({
      success: true,
      data: res,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
