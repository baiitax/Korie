import { NextRequest, NextResponse } from 'next/server';
import { ThirdPartyRiskEngine } from '@/lib/erm/ThirdPartyRiskEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = ThirdPartyRiskEngine.getInstance();
    const vendors = engine.getVendors();

    return NextResponse.json({
      success: true,
      data: vendors,
      count: vendors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
