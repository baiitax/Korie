import { NextResponse } from 'next/server';
import { ProductEligibilityEngine } from '@/lib/products/ProductEligibilityEngine';
import { CustomerLifecycleEngine } from '@/lib/customer/CustomerLifecycleEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customerEngine = CustomerLifecycleEngine.getInstance();
    const customer = customerEngine.getCustomer(body.customerId);

    if (!customer) {
      return NextResponse.json({ success: false, error: 'CUSTOMER_NOT_FOUND' }, { status: 404 });
    }

    const eligibilityEngine = ProductEligibilityEngine.getInstance();
    const result = eligibilityEngine.evaluateEligibility({
      customer,
      productCode: body.productCode,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
