// Bank Core API — inbound funding.
//   POST /api/bank/v1/funding { accountNumber, amount, narration? }
// Credits a customer NUBAN as an inbound bank credit: nostro asset up,
// customer-wallet liability up, wallet subledger credited. In production this
// is a partner webhook (Providus virtual-account receipt); in the sandbox it
// is the explicit inbound-credit operation — always journaled, never fake.
import { NextRequest, NextResponse } from 'next/server';
import { BankCoreEngine } from '@/lib/bank/BankCoreEngine';
import { bankApiGuard } from '@/lib/bank/bankApiGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const denied = await bankApiGuard(req, 'write');
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({}));
    const result = await BankCoreEngine.getInstance().creditInbound({
      accountNumber: String(body.accountNumber || ''),
      amount: Number(body.amount),
      narration: body.narration ? String(body.narration) : undefined,
      idempotencyKey: req.headers.get('idempotency-key') || undefined,
    });
    if (!result.success) {
      const status = result.code === 'IDEMPOTENCY_KEY_REUSED' ? 422 : 400;
      return NextResponse.json(
        { success: false, error: { code: result.code || 'CREDIT_FAILED', message: result.message } },
        { status },
      );
    }
    return NextResponse.json({ success: true, data: { transaction: result.transaction, journalId: result.journalId, ...(result.replayed ? { replayed: true } : {}) } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Funding engine error';
    return NextResponse.json({ success: false, error: { code: 'ENGINE_ERROR', message } }, { status: 500 });
  }
}
