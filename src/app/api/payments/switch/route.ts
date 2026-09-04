import { NextResponse } from 'next/server';
import { PaymentSwitchEngine } from '@/lib/paymentSwitch/PaymentSwitchEngine';
import { PaymentRoutingEngine } from '@/lib/paymentSwitch/PaymentRoutingEngine';
import { ProviderWebhookService } from '@/lib/paymentSwitch/ProviderWebhookService';

export async function GET(request: Request) {
  try {
    const switchEngine = PaymentSwitchEngine.getInstance();
    const routingEngine = PaymentRoutingEngine.getInstance();
    const webhookService = ProviderWebhookService.getInstance();

    const payments = switchEngine.getPayments();
    const attempts = switchEngine.getAttempts();
    const rules = routingEngine.getRules();
    const capabilities = routingEngine.getCapabilities();
    const webhookLogs = webhookService.getWebhookLogs();

    return NextResponse.json({
      success: true,
      data: {
        payments,
        attempts,
        routingRules: rules,
        providerCapabilities: capabilities,
        webhookLogs,
        summary: {
          totalPayments: payments.length,
          totalAttempts: attempts.length,
          successfulPayments: payments.filter((p) => p.businessState === 'SUCCESSFUL').length,
          successRate: payments.length > 0
            ? Math.round((payments.filter((p) => p.businessState === 'SUCCESSFUL').length / payments.length) * 100)
            : 100,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const switchEngine = PaymentSwitchEngine.getInstance();

    const result = await switchEngine.initiatePayment(body);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, payment: result.payment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
