import { NextRequest, NextResponse } from 'next/server';
import { TerminalManagementEngine } from '@/lib/agency/TerminalManagementEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = TerminalManagementEngine.getInstance();
    const terminals = engine.getTerminals();

    return NextResponse.json({
      success: true,
      data: terminals,
      count: terminals.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
