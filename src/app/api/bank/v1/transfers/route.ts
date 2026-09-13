// Bank Core API — transfers.
//   POST /api/bank/v1/transfers
//     { type: "INTERNAL", fromAccount, toAccount, amount, narration? }
//     { type: "NIP_OUT", fromAccount, amount, destinationBank,
//       destinationAccount, destinationName?, narration? }
// Every transfer posts a real double-entry ledger journal and moves the
// wallet subledgers + partner-nostro float. Idempotency keys are honoured per
// request header idempotency-key (see engine reference prefix semantics).
import { NextRequest, NextResponse } from 'next/server';
import { BankCoreEngine } from '@/lib/bank/BankCoreEngine';
import { bankApiGuard } from '@/lib/bank/bankApiGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const denied = await bankApiGuard(req, 'write');
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({}));
    const type = String(body.type || '');
    const engine = BankCoreEngine.getInstance();
    if (type === 'INTERNAL') {
      const result = await engine.internalTransfer({
        fromAccount: String(body.fromAccount || ''),
        toAccount: String(body.toAccount || ''),
        amount: Number(body.amount),
        narration: body.narration ? String(body.narration) : undefined,
      });
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: { code: result.code || 'TRANSFER_FAILED', message: result.message } },
          { status: 400 },
        );
      }
      return NextResponse.json({ success: true, data: { transaction: result.transaction, journalId: result.journalId } });
    }
    if (type === 'NIP_OUT') {
      const result = await engine.nipOut({
        fromAccount: String(body.fromAccount || ''),
        amount: Number(body.amount),
        destinationBank: String(body.destinationBank || ''),
        destinationAccount: String(body.destinationAccount || ''),
        destinationName: body.destinationName ? String(body.destinationName) : undefined,
        narration: body.narration ? String(body.narration) : undefined,
      });
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: { code: result.code || 'TRANSFER_FAILED', message: result.message } },
          { status: 400 },
        );
      }
      return NextResponse.json({ success: true, data: { transaction: result.transaction, journalId: result.journalId } });
    }
    return NextResponse.json(
      { success: false, error: { code: 'UNKNOWN_TYPE', message: 'type must be INTERNAL or NIP_OUT.' } },
      { status: 400 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transfer engine error';
    return NextResponse.json({ success: false, error: { code: 'ENGINE_ERROR', message } }, { status: 500 });
  }
}
