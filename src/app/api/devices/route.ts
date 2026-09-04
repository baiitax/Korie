import { NextResponse } from 'next/server';
import { DeviceManagementEngine } from '@/lib/devices/DeviceManagementEngine';

export async function GET(request: Request) {
  try {
    const deviceEngine = DeviceManagementEngine.getInstance();
    const devices = deviceEngine.getDevices();

    return NextResponse.json({
      success: true,
      data: {
        devices,
        total: devices.length,
        trusted: devices.filter((d) => d.trustStatus === 'TRUSTED').length,
        atRisk: devices.filter((d) => d.trustStatus === 'ELEVATED_RISK' || d.trustStatus === 'HIGH_RISK' || d.trustStatus === 'COMPROMISED').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const deviceEngine = DeviceManagementEngine.getInstance();

    if (body.action === 'UPDATE_TRUST') {
      const result = deviceEngine.updateTrustStatus(body.deviceId, body.status, body.reason);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, device: result.device });
    }

    const device = deviceEngine.registerDevice(body);
    return NextResponse.json({ success: true, device });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
