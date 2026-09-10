import { NextResponse } from 'next/server';
import { ComplaintDisputeEngine } from '@/lib/complaints/ComplaintDisputeEngine';
import { ComplaintCategory, ComplaintPriority } from '@/types/regulatoryConsumerEngine';

const CATEGORIES: ComplaintCategory[] = [
  'FAILED_TRANSFER',
  'DUPLICATE_DEBIT',
  'AGENT_OVERCHARGING',
  'AGENT_HARASSMENT',
  'UNAUTHORIZED_TRANSACTION',
  'POS_TERMINAL_GLITCH',
  'REFUND_DELAY',
  'FEE_DISPUTE',
  'ACCOUNT_RESTRICTION',
];
const PRIORITIES: ComplaintPriority[] = ['P0', 'P1', 'P2', 'P3'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || undefined;
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;

    const engine = ComplaintDisputeEngine.getInstance();
    const complaints = engine.getComplaints({ country, status, priority });

    return NextResponse.json({
      success: true,
      data: {
        complaints,
        total: complaints.length,
        open: complaints.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
        resolved: complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length,
        p0Critical: complaints.filter((c) => c.priority === 'P0').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Intake. Only customer-supplied facts are accepted — the engine owns the
 * reference, the status, the SLA clock and all measurement fields. Anything
 * that is not in this whitelist is dropped rather than copied, so a caller
 * cannot post `csatScore`, `isSeed`, `status` or a pre-dated `slaDueAt` and
 * have the console report it as a customer's reality.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const customerId = String(body.customerId || '').trim();
    const customerName = String(body.customerName || '').trim();
    const customerPhone = String(body.customerPhone || '').trim();
    const country = String(body.country || '').toUpperCase();
    const category = String(body.category || '').toUpperCase() as ComplaintCategory;
    const currency = String(body.currency || '').toUpperCase();
    const description = String(body.description || '').trim();
    const disputedAmount = Number(body.disputedAmount ?? 0);
    const priorityRaw = body.priority ? String(body.priority).toUpperCase() : undefined;

    if (!customerId || !customerName || !customerPhone) {
      return NextResponse.json({ success: false, error: 'CUSTOMER_IDENTITY_REQUIRED' }, { status: 400 });
    }
    if (country !== 'NG' && country !== 'NE') {
      return NextResponse.json({ success: false, error: 'COUNTRY_MUST_BE_NG_OR_NE' }, { status: 400 });
    }
    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ success: false, error: 'CATEGORY_NOT_SUPPORTED' }, { status: 400 });
    }
    if (currency !== 'NGN' && currency !== 'XOF') {
      return NextResponse.json({ success: false, error: 'CURRENCY_MUST_BE_NGN_OR_XOF' }, { status: 400 });
    }
    if (description.length < 10) {
      return NextResponse.json({ success: false, error: 'DESCRIPTION_TOO_SHORT' }, { status: 400 });
    }
    if (!Number.isFinite(disputedAmount) || disputedAmount < 0) {
      return NextResponse.json({ success: false, error: 'INVALID_DISPUTED_AMOUNT' }, { status: 400 });
    }
    if (priorityRaw && !PRIORITIES.includes(priorityRaw as ComplaintPriority)) {
      return NextResponse.json({ success: false, error: 'INVALID_PRIORITY' }, { status: 400 });
    }

    const engine = ComplaintDisputeEngine.getInstance();
    const complaint = engine.createComplaint({
      customerId,
      customerName,
      customerPhone,
      country,
      category,
      priority: priorityRaw as ComplaintPriority | undefined,
      transactionReference: body.transactionReference ? String(body.transactionReference).slice(0, 64) : undefined,
      paymentId: body.paymentId ? String(body.paymentId).slice(0, 64) : undefined,
      agentId: body.agentId ? String(body.agentId).slice(0, 64) : undefined,
      terminalId: body.terminalId ? String(body.terminalId).slice(0, 64) : undefined,
      disputedAmount,
      currency,
      description: description.slice(0, 2000),
    });
    return NextResponse.json({ success: true, complaint });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
