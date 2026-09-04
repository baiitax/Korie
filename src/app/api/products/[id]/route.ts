import { NextResponse } from 'next/server';
import { BankingProductFactory } from '@/lib/products/BankingProductFactory';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const factory = BankingProductFactory.getInstance();
    const product = factory.getProduct(params.id);

    if (!product) {
      return NextResponse.json({ success: false, error: 'PRODUCT_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
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
    const factory = BankingProductFactory.getInstance();

    if (body.action === 'UPDATE_STATUS') {
      const result = factory.updateProductStatus(params.id, body.status, body.actorEmail || 'admin@koriepay.com');
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, product: result.product });
    }

    if (body.action === 'KILL_SWITCH') {
      const result = factory.triggerEmergencyKillSwitch(params.id, body.killAction, body.reason);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, product: result.product });
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
