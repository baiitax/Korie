import { NextRequest, NextResponse } from 'next/server';
import { TreasuryEngine } from '@/lib/treasury/TreasuryEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currency = (searchParams.get('currency') as 'NGN' | 'XOF' | 'ALL') || 'ALL';

    const accounts = TreasuryEngine.getAccounts(currency);

    return NextResponse.json({
      success: true,
      data: accounts,
      count: accounts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
