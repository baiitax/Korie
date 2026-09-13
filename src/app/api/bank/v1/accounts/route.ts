// Bank Core API — accounts.
//   GET  /api/bank/v1/accounts?nuban=0112345678   → account + balance + statement
//   GET  /api/bank/v1/accounts                    → all bank-opened accounts (light)
//   POST /api/bank/v1/accounts { fullName, phone, email? } → open a real transactable NGN NUBAN
import { NextRequest, NextResponse } from 'next/server';
import { BankCoreEngine } from '@/lib/bank/BankCoreEngine';
import { SubledgerEngine } from '@/lib/financial/SubledgerEngine';
import { bankApiGuard } from '@/lib/bank/bankApiGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const denied = await bankApiGuard(req, 'read');
  if (denied) return denied;
  try {
    const engine = BankCoreEngine.getInstance();
    const nuban = new URL(req.url).searchParams.get('nuban') || '';
    if (nuban) {
      const account = engine.accountByNumber(nuban);
      if (!account) {
        return NextResponse.json({ success: false, error: { code: 'ACCOUNT_NOT_FOUND', message: 'No account with that number.' } }, { status: 404 });
      }
      const wallet = SubledgerEngine.getInstance().getSubledger('CUSTOMER_WALLET', account.customerId, 'NGN');
      return NextResponse.json({
        success: true,
        data: {
          account: {
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            productCode: account.productCode,
            currency: account.currency,
            assignedBankName: account.assignedBankName,
            status: account.status,
            openedAt: account.openedAt,
          },
          balance: {
            available: wallet && wallet.isActive ? wallet.availableBalance : 0,
            ledger: wallet && wallet.isActive ? wallet.currentBalance : 0,
            held: wallet && wallet.isActive ? wallet.heldBalance : 0,
          },
          statement: engine.transactionsFor(account.accountNumber, 25),
        },
      });
    }
    const rows = engine.liquidityPositions();
    return NextResponse.json({
      success: true,
      data: { nodes: rows.map((r) => ({ nodeId: r.nodeId, bankName: r.bankName, currency: r.currency, settlementAccount: r.settlementAccount })) },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Account engine error';
    return NextResponse.json({ success: false, error: { code: 'ENGINE_ERROR', message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await bankApiGuard(req, 'write');
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({}));
    const result = BankCoreEngine.getInstance().openAccount({
      fullName: String(body.fullName || ''),
      phone: String(body.phone || ''),
      email: body.email ? String(body.email) : undefined,
    });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: result.code || 'OPEN_FAILED', message: result.message || 'Account could not be opened.' } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        success: true,
        data: {
          account: result.account,
          customerId: result.customerId,
          created: result.created !== false,
          fundingInstructions: {
            bank: 'Providus Bank Plc',
            accountNumber: '0123984123',
            note: 'Credit this settlement account with a narration containing the NUBAN to fund the account (inbound credit).',
          },
        },
      },
      { status: result.created === false ? 200 : 201 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Account engine error';
    return NextResponse.json({ success: false, error: { code: 'ENGINE_ERROR', message } }, { status: 500 });
  }
}
