import { NextResponse } from 'next/server';
import { CustomerLifecycleEngine } from '@/lib/customer/CustomerLifecycleEngine';
import { AccountLifecycleEngine } from '@/lib/customer/AccountLifecycleEngine';
import { BeneficiarySecurityEngine } from '@/lib/customer/BeneficiarySecurityEngine';
import { ComplaintDisputeEngine } from '@/lib/complaints/ComplaintDisputeEngine';
import { PaymentSwitchEngine } from '@/lib/paymentSwitch/PaymentSwitchEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('id') || 'cust-ng-001-ibrahim';

    const customerEngine = CustomerLifecycleEngine.getInstance();
    const accountEngine = AccountLifecycleEngine.getInstance();
    const beneficiaryEngine = BeneficiarySecurityEngine.getInstance();
    const complaintEngine = ComplaintDisputeEngine.getInstance();
    const switchEngine = PaymentSwitchEngine.getInstance();

    const customer = customerEngine.getCustomer(customerId);
    if (!customer) {
      return NextResponse.json({ success: false, error: 'CUSTOMER_NOT_FOUND' }, { status: 404 });
    }

    const accounts = accountEngine.getAccounts(customerId);
    const beneficiaries = beneficiaryEngine.getBeneficiaries(customerId);
    const complaints = complaintEngine.getComplaints().filter((c) => c.customerId === customerId);
    const payments = switchEngine.getPayments().filter((p) => p.customerId === customerId);

    return NextResponse.json({
      success: true,
      data: {
        customer,
        accounts,
        beneficiaries,
        complaints,
        payments,
        summary: {
          totalAccounts: accounts.length,
          totalBeneficiaries: beneficiaries.length,
          openComplaints: complaints.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
          totalTransactions: payments.length,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
