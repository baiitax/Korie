import { NextResponse } from 'next/server';
import { TerminalManagementEngine } from '@/lib/terminals/TerminalManagementEngine';

export async function GET(request: Request) {
  try {
    const terminalEngine = TerminalManagementEngine.getInstance();
    const terminals = terminalEngine.getTerminals();

    return NextResponse.json({
      success: true,
      data: {
        terminals,
        total: terminals.length,
        active: terminals.filter((t) => t.status === 'ACTIVE').length,
        inZone: terminals.filter((t) => t.currentLocationState === 'IN_ZONE').length,
        outOfZone: terminals.filter((t) => t.currentLocationState === 'OUT_OF_ZONE' || t.currentLocationState === 'LOCATION_SUSPICIOUS').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const terminalEngine = TerminalManagementEngine.getInstance();

    if (body.action === 'ASSIGN') {
      const result = terminalEngine.assignTerminal(
        body.terminalId,
        body.agentId,
        body.assignedBy || 'admin@koriepay.com',
        body.reason || 'Terminal fleet assignment'
      );
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (body.action === 'UPDATE_STATUS') {
      const result = terminalEngine.updateTerminalStatus(body.terminalId, body.status, body.reason);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, terminal: result.terminal });
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
