import { NextResponse } from 'next/server';
import { TerminalManagementEngine } from '@/lib/terminals/TerminalManagementEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const terminalEngine = TerminalManagementEngine.getInstance();

    const result = terminalEngine.recordHeartbeat({
      terminalId: body.terminalId,
      lat: body.lat !== undefined ? Number(body.lat) : undefined,
      lng: body.lng !== undefined ? Number(body.lng) : undefined,
      batteryLevel: body.batteryLevel !== undefined ? Number(body.batteryLevel) : undefined,
      networkType: body.networkType,
      appVersion: body.appVersion,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, terminal: result.terminal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
