import { NextRequest, NextResponse } from 'next/server';
import { PartnerManagementEngine } from '@/lib/integration/PartnerManagementEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = PartnerManagementEngine.getInstance();
    const partners = engine.getPartners();

    return NextResponse.json({
      success: true,
      data: partners,
      count: partners.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
