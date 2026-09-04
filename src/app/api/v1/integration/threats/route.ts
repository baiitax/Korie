import { NextRequest, NextResponse } from 'next/server';
import { ApiSecurityThreatEngine } from '@/lib/integration/ApiSecurityThreatEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = ApiSecurityThreatEngine.getInstance();
    const threats = engine.getThreats();

    return NextResponse.json({
      success: true,
      data: threats,
      count: threats.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
