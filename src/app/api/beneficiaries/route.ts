import { NextResponse } from 'next/server';
import { BeneficiarySecurityEngine } from '@/lib/customer/BeneficiarySecurityEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId') || 'cust-ng-001-ibrahim';

    const engine = BeneficiarySecurityEngine.getInstance();
    const beneficiaries = engine.getBeneficiaries(customerId);

    return NextResponse.json({
      success: true,
      data: {
        beneficiaries,
        total: beneficiaries.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const engine = BeneficiarySecurityEngine.getInstance();

    const beneficiary = engine.addBeneficiary(body);
    return NextResponse.json({ success: true, beneficiary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
