import { NextRequest, NextResponse } from 'next/server';
import { DeviceTrustEngine } from '@/lib/agency/DeviceTrustEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = DeviceTrustEngine.getInstance();
    const devices = engine.getDevices();

    return NextResponse.json({
      success: true,
      data: devices,
      count: devices.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
