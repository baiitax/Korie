// Wallet-control truth surface — account lifecycle records joined to their live
// subledger positions, plus agent float and active escrow holds.
// GET /api/admin/wallets/overview?country=GLOBAL|NG|NE
import { NextRequest, NextResponse } from 'next/server';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';
import { AccountLifecycleEngine } from '@/lib/customer/AccountLifecycleEngine';
import { CustomerLifecycleEngine } from '@/lib/customer/CustomerLifecycleEngine';
import { AgentManagementEngine } from '@/lib/agents/AgentManagementEngine';
import { SubledgerEngine } from '@/lib/financial/SubledgerEngine';
import { LedgerService } from '@/lib/services/LedgerService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gateway = ApiGatewayEngine.getInstance();
  try {
    const raw = (new URL(req.url).searchParams.get('country') || 'GLOBAL').toUpperCase();
    const country: 'GLOBAL' | 'NG' | 'NE' = raw === 'NG' || raw === 'NE' ? raw : 'GLOBAL';

    const customers = CustomerLifecycleEngine.getInstance();
    const subs = SubledgerEngine.getInstance();
    const accounts = AccountLifecycleEngine.getInstance()
      .getAccounts()
      .filter((a) => country === 'GLOBAL' || a.country === country)
      .map((a) => {
        const owner = customers.getCustomer(a.customerId);
        const sub = subs.getSubledger('CUSTOMER_WALLET', a.customerId, a.currency);
        return {
          id: a.id,
          accountNumber: a.accountNumber,
          accountName: a.accountName,
          customerId: a.customerId,
          customerName: owner?.fullName || null,
          customerNameUnresolved: !owner,
          currency: a.currency,
          country: a.country,
          status: a.status,
          restrictions: a.restrictions || [],
          subledger: sub
            ? {
                current: sub.currentBalance,
                held: sub.heldBalance,
                available: sub.availableBalance,
                unit: 'MAJOR' as const,
                isActive: sub.isActive,
              }
            : null,
          assignedBankName: a.assignedBankName,
          openedAt: a.openedAt,
          lastActivityAt: a.lastActivityAt || null,
        };
      });

    const agents = AgentManagementEngine.getInstance()
      .getAgents()
      .filter((a) => country === 'GLOBAL' || a.country === country)
      .map((a) => {
        const sub = subs.getSubledger('AGENT_FLOAT', a.id, a.currency);
        return {
          id: a.id,
          agentCode: a.agentCode,
          tradingName: a.tradingName,
          country: a.country,
          currency: a.currency,
          status: a.status,
          float: sub
            ? {
                current: sub.currentBalance,
                held: sub.heldBalance,
                available: sub.availableBalance,
                unit: 'MAJOR' as const,
              }
            : null,
        };
      });

    const holds = LedgerService.listHolds()
      .filter((h) => h.status === 'ACTIVE')
      .map((h) => ({
        id: h.id,
        walletId: h.walletId,
        accountId: h.accountId,
        amountMinor: h.amount,
        currency: h.currency,
        reason: h.reason,
        reference: h.reference,
        expiresAt: h.expiresAt,
        createdAt: h.createdAt,
      }));

    return NextResponse.json(
      gateway.createResponse({
        generatedAt: new Date().toISOString(),
        country,
        accounts,
        agents,
        holds,
        notes: [
          'Balances are live subledger positions in major units (naira / CFA). Ledger escrow holds are minor units (kobo).',
          'The balances stored on the account record itself are opening-time values and are not shown — the subledger is the authoritative position.',
          'Restrictions are enforced by the bank core: FULL_FREEZE blocks all movement; directional restrictions block the named side. See the account lifecycle engine for the recorded state.',
          'Account lifecycle records are in-memory: a server restart returns the registry to its seeds. The subledger, ledger and audit trail are file-backed and survive restarts.',
        ],
        sources: [
          { key: 'accounts', engine: 'AccountLifecycleEngine.getAccounts', records: accounts.length },
          { key: 'customers', engine: 'CustomerLifecycleEngine (owner resolution)', records: accounts.filter((a) => !a.customerNameUnresolved).length },
          { key: 'subledgers', engine: 'SubledgerEngine (CUSTOMER_WALLET / AGENT_FLOAT)', records: accounts.filter((a) => a.subledger).length + agents.filter((a) => a.float).length },
          { key: 'holds', engine: 'LedgerService.listHolds (ACTIVE)', records: holds.length },
        ],
      }),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Wallet overview aggregation failed';
    return NextResponse.json(gateway.createError('WALLETS_TRUTH_UNAVAILABLE', message), { status: 500 });
  }
}
