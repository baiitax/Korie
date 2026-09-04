import { NextResponse } from 'next/server';
import { AccountLifecycleEngine } from '@/lib/customer/AccountLifecycleEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const engine = AccountLifecycleEngine.getInstance();

    const result = engine.openAccount({
      customerId: body.customerId,
      productCode: body.productCode,
      accountName: body.accountName,
      country: body.country,
      currency: body.currency,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, account: result.account });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
