import { NextResponse } from 'next/server';
import { AccountLifecycleEngine } from '@/lib/customer/AccountLifecycleEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId') || undefined;

    const engine = AccountLifecycleEngine.getInstance();
    const accounts = engine.getAccounts(customerId);

    return NextResponse.json({
      success: true,
      data: {
        accounts,
        total: accounts.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
