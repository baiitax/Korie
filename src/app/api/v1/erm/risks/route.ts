import { NextRequest, NextResponse } from 'next/server';
import { RiskRegisterEngine } from '@/lib/erm/RiskRegisterEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = RiskRegisterEngine.getInstance();
    const risks = engine.getRisks();

    return NextResponse.json({
      success: true,
      data: risks,
      count: risks.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const engine = RiskRegisterEngine.getInstance();
    const risk = engine.registerRisk(body);

    return NextResponse.json({
      success: true,
      data: risk,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
