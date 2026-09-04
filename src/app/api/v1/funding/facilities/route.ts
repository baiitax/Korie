import { NextRequest, NextResponse } from 'next/server';
import { FundingManagementEngine } from '@/lib/treasury/FundingManagementEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = FundingManagementEngine.getInstance();
    const facilities = engine.getFacilities();

    return NextResponse.json({
      success: true,
      data: facilities,
      count: facilities.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
