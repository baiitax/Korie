import { NextResponse } from 'next/server';
import { AccountLifecycleEngine } from '@/lib/customer/AccountLifecycleEngine';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const engine = AccountLifecycleEngine.getInstance();
    const account = engine.getAccount(params.id);

    if (!account) {
      return NextResponse.json({ success: false, error: 'ACCOUNT_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true, account });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const engine = AccountLifecycleEngine.getInstance();

    if (body.action === 'RESTRICT') {
      const result = engine.applyRestriction(params.id, body.restriction, body.reason);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, account: result.account });
    }

    if (body.action === 'UNRESTRICT') {
      const result = engine.liftRestriction(params.id, body.restriction);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, account: result.account });
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
