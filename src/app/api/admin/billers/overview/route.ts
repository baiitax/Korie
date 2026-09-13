// Bill-payments truth surface — the till engine's biller catalog, the payments it
// has actually journaled, per-biller volumes, and the settlement liability those
// payments created. Replaces the page-local KEDCO/NIGELEC fiction.
// GET /api/admin/billers/overview
import { NextRequest, NextResponse } from 'next/server';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';
import { BillerServiceEngine } from '@/lib/agent/BillerServiceEngine';
import { LedgerService } from '@/lib/services/LedgerService';
import { adminApiGuard } from '@/lib/security/apiGuards';

export const dynamic = 'force-dynamic';

const BILLER_SETTLEMENTS = 'acc_liab_biller_settlements_ngn';
const COMMISSIONS_PAYABLE = 'acc_liab_agent_commissions_payable_ngn';

function maskPhone(phone: string | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `${phone.slice(0, 4)} ••• ••${digits.slice(-2)}`;
}

export async function GET(_req: NextRequest) {
  const guard = await adminApiGuard(_req, 'read');
  if (!guard.ok) return guard.response;
  const gateway = ApiGatewayEngine.getInstance();
  try {
    const engine = BillerServiceEngine.getInstance();
    const catalog = engine.listBillers();
    const categories = engine.listCategories();
    const payments = engine.listPayments(200);

    const volumes = new Map<string, { count: number; principal: number; charges: number }>();
    for (const p of payments) {
      const key = p.serviceRef || 'UNMAPPED';
      const row = volumes.get(key) || { count: 0, principal: 0, charges: 0 };
      row.count += 1;
      row.principal += p.amount || 0;
      row.charges += p.customerFee || 0;
      volumes.set(key, row);
    }

    const accounts = LedgerService.listAccounts();
    const settlements = accounts.find((a) => a.id === BILLER_SETTLEMENTS);
    const commissions = accounts.find((a) => a.id === COMMISSIONS_PAYABLE);

    return NextResponse.json(
      gateway.createResponse({
        generatedAt: new Date().toISOString(),
        catalog: catalog.map((b) => ({
          billerId: b.billerId,
          name: b.name,
          category: b.category,
          serviceChargeNgn: b.serviceChargeNgn,
          minAmountNgn: b.minAmountNgn,
          maxAmountNgn: b.maxAmountNgn,
          status: b.status,
          feeRuleApplied: b.feeRuleApplied,
          payments: volumes.get(b.billerId) || { count: 0, principal: 0, charges: 0 },
        })),
        categories,
        payments: payments.map((p) => ({
          id: p.id,
          reference: p.reference,
          title: p.title,
          billerId: p.serviceRef || null,
          amount: p.amount,
          customerFee: p.customerFee,
          agentCommission: p.agentCommission,
          totalAmount: p.totalAmount,
          currency: p.currency,
          status: p.status,
          customerName: p.customerName || null,
          customerPhoneMasked: maskPhone(p.customerPhone),
          terminalId: p.terminalId,
          ledgerJournalId: p.ledgerJournalId || null,
          createdAt: p.createdAt,
        })),
        liability: {
          billerSettlementsMinor: settlements?.balance ?? 0,
          agentCommissionsPayableMinor: commissions?.balance ?? 0,
          unit: 'MINOR (kobo)',
        },
        notes: [
          'The catalog is the till engine\u2019s seed truth for names, charges and ranges — every payment the till accepts must name one of these billers.',
          'Bill payments are NGN cash-at-till only. The engine has no XOF billers and vends no prepaid tokens: each payment records a ledger reference, not a meter token.',
          'Liability balances are minor units (kobo) read from the posted ledger, not summed from the payment list.',
        ],
        sources: [
          { key: 'catalog', engine: 'BillerServiceEngine.listBillers', records: catalog.length },
          { key: 'payments', engine: 'BillerServiceEngine.listPayments (kiosk stream)', records: payments.length },
          { key: 'liability', engine: 'LedgerService.listAccounts (acc_liab_biller_settlements_ngn, acc_liab_agent_commissions_payable_ngn)', records: 2 },
        ],
      }),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Biller overview aggregation failed';
    return NextResponse.json(gateway.createError('BILLERS_TRUTH_UNAVAILABLE', message), { status: 500 });
  }
}
