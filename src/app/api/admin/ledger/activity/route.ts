// Money-movement truth surface — every posted journal and every bank-core rail
// operation in one inspectable feed. Replaces the TRANSACTIONS fiction array.
// GET /api/admin/ledger/activity?kind=ALL|JOURNAL|BANK&search=&limit=
import { NextRequest, NextResponse } from 'next/server';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';
import { LedgerService } from '@/lib/services/LedgerService';
import { BankCoreEngine } from '@/lib/bank/BankCoreEngine';
import { adminApiGuard } from '@/lib/security/apiGuards';

export const dynamic = 'force-dynamic';

export interface LedgerActivityRow {
  id: string;
  source: 'LEDGER_JOURNAL' | 'BANK_TXN';
  reference: string;
  type: string;
  description: string;
  currency: string;
  /** Major units (naira / CFA). Journals are stored minor and converted here. */
  amountMajor: number;
  status: string;
  parties: { from?: string; to?: string };
  ledgerJournalId: string | null;
  gatewayMode: string | null;
  entries: { account: string; accountName?: string; entryType: 'DEBIT' | 'CREDIT'; amountMinor: number }[];
  createdAt: string;
}

export async function GET(req: NextRequest) {
  const guard = await adminApiGuard(req, 'read');
  if (!guard.ok) return guard.response;
  const gateway = ApiGatewayEngine.getInstance();
  try {
    const params = new URL(req.url).searchParams;
    const kind = (params.get('kind') || 'ALL').toUpperCase();
    const search = (params.get('search') || '').trim().toLowerCase();
    const limit = Math.min(Math.max(Number(params.get('limit')) || 100, 1), 500);

    const rows: LedgerActivityRow[] = [];
    const accountNames = new Map(LedgerService.listAccounts().map((a) => [a.id, a.name]));

    if (kind === 'ALL' || kind === 'JOURNAL') {
      for (const t of LedgerService.listTransactions(limit)) {
        rows.push({
          id: t.id,
          source: 'LEDGER_JOURNAL',
          reference: t.transactionReference,
          type: t.entries.length > 2 ? `${t.entries.length}-LEG JOURNAL` : 'DOUBLE-ENTRY JOURNAL',
          description: t.description,
          currency: t.currency,
          amountMajor: t.totalAmount / 100,
          status: t.status,
          parties: {},
          ledgerJournalId: t.id,
          gatewayMode: null,
          entries: t.entries.map((e) => ({
            account: e.accountId,
            accountName: accountNames.get(e.accountId),
            entryType: e.entryType,
            amountMinor: e.amount,
          })),
          createdAt: t.postedAt || t.createdAt,
        });
      }
    }
    if (kind === 'ALL' || kind === 'BANK') {
      for (const b of BankCoreEngine.getInstance().transactions(limit)) {
        rows.push({
          id: b.id,
          source: 'BANK_TXN',
          reference: b.reference,
          type: b.type,
          description: b.narration || b.type,
          currency: b.currency,
          amountMajor: b.amount,
          status: b.status,
          parties: { from: b.fromAccount, to: b.toAccount || b.toBank },
          ledgerJournalId: b.ledgerJournalId || null,
          gatewayMode: b.gatewayMode,
          entries: [],
          createdAt: b.createdAt,
        });
      }
    }

    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const filtered = search
      ? rows.filter((r) =>
          [r.reference, r.description, r.type, r.parties.from || '', r.parties.to || '']
            .join(' ')
            .toLowerCase()
            .includes(search),
        )
      : rows;

    return NextResponse.json(
      gateway.createResponse({
        generatedAt: new Date().toISOString(),
        rows: filtered.slice(0, limit),
        counts: {
          journals: rows.filter((r) => r.source === 'LEDGER_JOURNAL').length,
          bankTxns: rows.filter((r) => r.source === 'BANK_TXN').length,
        },
        notes: [
          'Journals are the posted double-entry record (LedgerService, minor units converted here); bank rows are rail operations (BankCoreEngine, whole units). A rail operation and its journal describe the same movement — they are listed side by side, never summed.',
          'ACCOUNT_OPEN rows carry no journal and no amount: opening an account moves no money.',
        ],
        sources: [
          { key: 'journals', engine: 'LedgerService.listTransactions (with entries)', records: rows.filter((r) => r.source === 'LEDGER_JOURNAL').length },
          { key: 'bankTxns', engine: 'BankCoreEngine.transactions', records: rows.filter((r) => r.source === 'BANK_TXN').length },
        ],
      }),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ledger activity aggregation failed';
    return NextResponse.json(gateway.createError('LEDGER_ACTIVITY_UNAVAILABLE', message), { status: 500 });
  }
}
