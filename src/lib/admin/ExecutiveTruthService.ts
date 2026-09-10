// =============================================================================
// File: src/lib/admin/ExecutiveTruthService.ts
// Description: Executive-home truth aggregator.
//
// GAP-1 remediation: the Super Admin home previously rendered from hand-written
// arrays (`services/adminDataService.ts`) — node telemetry, volumes, float and
// the "all nodes operational" headline were fiction. This service derives every
// executive figure from systems that actually record it:
//
//   · LedgerService            — posted double-entry journals (real references,
//                                amounts, timestamps; re-hydrated from store)
//   · BankCoreEngine           — bank-core transactions + partner-bank nostros
//   · AdminConfigurationEngine — BANK_NODE connectors + their last REAL probe
//                                (live HTTP health fetch, recorded result only)
//   · SubledgerEngine          — customer wallet subledger balances
//   · CustomerLifecycleEngine  — registered customers
//   · AccountLifecycleEngine   — open accounts (real minted NUBANs)
//   · AgentManagementEngine    — agent registry
//   · ExceptionEngine          — reconciliation exceptions actually raised
//
// Honesty rules enforced here:
//   · never invent a figure: a panel with no recording source returns null and
//     the UI renders "—" with the missing source named;
//   · success rates are only computed over records that carry a status, and the
//     sample size travels with the number;
//   · seeded opening balances (chart registry seeds) are reported separately
//     from live movements so they can never be mistaken for cleared volume.
// =============================================================================

import { LedgerService } from '@/lib/services/LedgerService';
import { SubledgerEngine } from '@/lib/financial/SubledgerEngine';
import { CustomerLifecycleEngine } from '@/lib/customer/CustomerLifecycleEngine';
import { AccountLifecycleEngine } from '@/lib/customer/AccountLifecycleEngine';
import { AgentManagementEngine } from '@/lib/agents/AgentManagementEngine';
import { ExceptionEngine } from '@/lib/reconciliation/ExceptionEngine';
import { BankCoreEngine } from '@/lib/bank/BankCoreEngine';
import { AdminConfigurationEngine } from '@/lib/admin/AdminConfigurationEngine';

export type TruthCountryFilter = 'GLOBAL' | 'NG' | 'NE';
export type TruthCurrency = 'NGN' | 'XOF';

export interface TruthSourceStatus {
  key: string;
  engine: string;
  available: boolean;
  records?: number;
  note?: string;
}

export interface ExecutiveNodeTruth {
  id: string;
  code: string;
  name: string;
  provider: string;
  country: string;
  currency: TruthCurrency;
  environment: string;
  /** connector lifecycle state as recorded by the config engine */
  status: string;
  /** liquidity rail mode resolved for this node (LIVE only when CONNECTED + PRODUCTION + credentialed) */
  railMode: 'LIVE' | 'SIMULATED';
  lastProbe: { at: string; ok: boolean; httpStatus?: number; latencyMs?: number; error?: string } | null;
  capabilities: number;
  nostro: { balance: number; settlementAccount: string; updatedAt: string; currency: TruthCurrency } | null;
  source: string;
}

export interface ExecutiveCurrencyTruth {
  currency: TruthCurrency;
  /** posted journals in the last 24h / all time */
  journalCount24h: number;
  journalCountTotal: number;
  /** bank-core transactions (they carry SUCCESSFUL/FAILED status) */
  bankTxnCount24h: number;
  bankTxnCountTotal: number;
  failedCount24h: number;
  /**
   * Value recorded this window, in minor units. The two series are reported
   * separately on purpose: bank-core operations also post a ledger journal, so
   * they overlap. Adding them double-counts.
   */
  ledgerClearedMinor24h: number;
  ledgerClearedMinorTotal: number;
  bankClearedMinor24h: number;
  bankClearedMinorTotal: number;
  /** computed only over status-bearing records; null when there are none */
  successRatePct: number | null;
  sampleSize24h: number;
}

export interface ExecutiveFeedRow {
  id: string;
  reference: string;
  kind: 'LEDGER_JOURNAL' | 'BANK_TXN';
  type: string;
  currency: TruthCurrency;
  amount: number;
  status: string;
  narration: string;
  at: string;
  entries: { account: string; entryType: 'DEBIT' | 'CREDIT'; amountMinor: number }[];
  source: string;
}

export interface ExecutiveTruthSnapshot {
  asOf: string;
  country: TruthCountryFilter;
  headline: {
    nodesTotal: number;
    nodesConnected: number;
    nodesProbed: number;
    nodesFailed: number;
    railMode: 'LIVE' | 'SIMULATED';
    statement: string;
  };
  nodes: ExecutiveNodeTruth[];
  volumes: ExecutiveCurrencyTruth[];
  liquidity: {
    nostros: { nodeId: string; currency: TruthCurrency; balance: number; settlementAccount: string; updatedAt: string }[];
    walletLiabilityMinor: { currency: TruthCurrency; minor: number; accounts: number }[];
    glLiquidityMinor: { accountNumber: string; name: string; currency: string; minor: number; isRegistrySeed: boolean }[];
  };
  entities: {
    customers: number | null;
    accounts: number | null;
    agents: number | null;
    merchants: number | null;
    bdcs: number | null;
  };
  exceptions: { total: number; open: number } | null;
  pendingApprovals: { count: number; items: { id: string; title: string; amount?: number; currency?: string }[] } | null;
  feed: ExecutiveFeedRow[];
  sources: TruthSourceStatus[];
  warnings: string[];
}

const NG_RAIL_LABEL = '🇳🇬';
const NE_RAIL_LABEL = '🇳🇪';

function minorToMajor(minor: number): number {
  return minor / 100;
}

function within24h(iso: string | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && Date.now() - t <= 24 * 60 * 60 * 1000;
}

export class ExecutiveTruthService {
  public static getSnapshot(country: TruthCountryFilter = 'GLOBAL'): ExecutiveTruthSnapshot {
    const warnings: string[] = [];
    const sources: TruthSourceStatus[] = [];

    // ---------------------------------------------------------------- nodes
    let nodes: ExecutiveNodeTruth[] = [];
    try {
      const config = AdminConfigurationEngine.getInstance();
      const connectors = config.listConnectors('BANK_NODE');
      const bank = BankCoreEngine.getInstance();
      const positions = bank.liquidityPositions();
      sources.push({
        key: 'nodes',
        engine: 'AdminConfigurationEngine (BANK_NODE) + BankCoreEngine',
        available: true,
        records: connectors.length,
        note: 'status and latency come only from recorded probes (real HTTP health fetch, 6s timeout); unprobed nodes show no latency',
      });

      nodes = connectors.map((c) => {
        const currency: TruthCurrency = c.country === 'NE' || c.currency === 'XOF' ? 'XOF' : 'NGN';
        const position = positions.find((p) => p.currency === currency) || null;
        const railLive = c.status === 'CONNECTED' && c.environment === 'PRODUCTION' && c.hasSecretConfigured;
        return {
          id: c.id,
          code: c.code,
          name: c.name,
          provider: c.vendor,
          country: c.country,
          currency,
          environment: c.environment,
          status: c.status,
          railMode: railLive ? 'LIVE' : 'SIMULATED',
          lastProbe: c.lastProbe
            ? {
                at: c.lastProbe.at,
                ok: c.lastProbe.ok,
                httpStatus: c.lastProbe.httpStatus,
                latencyMs: c.lastProbe.latencyMs,
                error: c.lastProbe.error,
              }
            : null,
          capabilities: c.capabilities.length,
          nostro: position
            ? {
                balance: position.balance,
                settlementAccount: position.settlementAccount,
                updatedAt: position.updatedAt,
                currency: position.currency as TruthCurrency,
              }
            : null,
          source: 'AdminConfigurationEngine + BankCoreEngine',
        };
      });

      if (nodes.length === 0) {
        warnings.push(
          'No BANK_NODE connectors are registered — add Providus/Coris under Configuration & Automation → Connections to see node truth.',
        );
      }
      if (nodes.length > 0 && nodes.every((n) => !n.lastProbe)) {
        warnings.push(
          'No node has been probed yet in this environment: connectivity is UNVERIFIED. Run a probe before treating any node as operational.',
        );
      }
    } catch (err) {
      sources.push({
        key: 'nodes',
        engine: 'AdminConfigurationEngine (BANK_NODE) + BankCoreEngine',
        available: false,
        note: err instanceof Error ? err.message : 'unavailable',
      });
      warnings.push('Banking-node telemetry source unavailable — node panel withheld rather than estimated.');
    }

    if (country !== 'GLOBAL') nodes = nodes.filter((n) => n.country === country);

    // --------------------------------------------------------------- ledger
    let ledgerTx: ReturnType<typeof LedgerService.listTransactions> = [];
    let ledgerAccounts: ReturnType<typeof LedgerService.listAccounts> = [];
    try {
      ledgerTx = LedgerService.listTransactions();
      ledgerAccounts = LedgerService.listAccounts();
      sources.push({
        key: 'ledger',
        engine: 'LedgerService',
        available: true,
        records: ledgerTx.length,
        note: 'posted double-entry journals only — chart opening balances are reported separately as registry seeds',
      });
    } catch (err) {
      sources.push({
        key: 'ledger',
        engine: 'LedgerService',
        available: false,
        note: err instanceof Error ? err.message : 'unavailable',
      });
      warnings.push('Ledger read failed — cleared-volume figures withheld.');
    }

    // ------------------------------------------------------------- bank core
    let bankTx: ReturnType<BankCoreEngine['transactions']> = [];
    try {
      bankTx = BankCoreEngine.getInstance().transactions(200);
      sources.push({
        key: 'bankCore',
        engine: 'BankCoreEngine',
        available: true,
        records: bankTx.length,
        note: 'bank-core operations (account open, funding, transfers, NIP) with their success/fail status',
      });
    } catch (err) {
      sources.push({
        key: 'bankCore',
        engine: 'BankCoreEngine',
        available: false,
        note: err instanceof Error ? err.message : 'unavailable',
      });
    }

    // -------------------------------------------------------------- volumes
    const currencies: TruthCurrency[] = country === 'NG' ? ['NGN'] : country === 'NE' ? ['XOF'] : ['NGN', 'XOF'];
    const volumes: ExecutiveCurrencyTruth[] = currencies.map((currency) => {
      const journals = ledgerTx.filter((t) => t.currency === currency);
      const bankTxns = bankTx.filter((t) => t.currency === currency);
      const journals24 = journals.filter((t) => within24h(t.postedAt || t.createdAt));
      const bank24 = bankTxns.filter((t) => within24h(t.createdAt));
      const failed24 = bank24.filter((t) => t.status === 'FAILED').length;
      const sampleSize24h = bank24.length;
      return {
        currency,
        journalCount24h: journals24.length,
        journalCountTotal: journals.length,
        bankTxnCount24h: bank24.length,
        bankTxnCountTotal: bankTxns.length,
        failedCount24h: failed24,
        ledgerClearedMinor24h: journals24.reduce((a, t) => a + t.totalAmount, 0),
        ledgerClearedMinorTotal: journals.reduce((a, t) => a + t.totalAmount, 0),
        bankClearedMinor24h: bank24.reduce((a, t) => a + Math.round(t.amount * 100), 0),
        bankClearedMinorTotal: bankTxns.reduce((a, t) => a + Math.round(t.amount * 100), 0),
        successRatePct: sampleSize24h > 0 ? Number((((sampleSize24h - failed24) / sampleSize24h) * 100).toFixed(2)) : null,
        sampleSize24h,
      };
    });

    // ------------------------------------------------------------ liquidity
    let walletLiabilityMinor: ExecutiveTruthSnapshot['liquidity']['walletLiabilityMinor'] = [];
    try {
      const subs = SubledgerEngine.getInstance().getAllSubledgers();
      sources.push({
        key: 'wallets',
        engine: 'SubledgerEngine',
        available: true,
        records: subs.length,
        note: 'per-customer wallet subledger balances (customer liability)',
      });
      for (const currency of currencies) {
        const list = subs.filter((s) => s.currency === currency && s.isActive);
        walletLiabilityMinor.push({
          currency,
          minor: Math.round(list.reduce((a, s) => a + s.currentBalance, 0) * 100),
          accounts: list.length,
        });
      }
    } catch (err) {
      sources.push({
        key: 'wallets',
        engine: 'SubledgerEngine',
        available: false,
        note: err instanceof Error ? err.message : 'unavailable',
      });
    }

    const glLiquidity = ledgerAccounts
      .filter((a) => a.type === 'ASSET' && /SETTLE|POOL|VAULT|LIQUIDITY/i.test(a.accountNumber))
      .map((a) => ({
        accountNumber: a.accountNumber,
        name: a.name,
        currency: a.currency,
        minor: a.balance,
        // Opening balances written into the chart seed (not cleared volume).
        isRegistrySeed: a.balance !== 0 && !ledgerTx.some((t) => t.entries.some((e) => e.accountId === a.id)),
      }));

    const nostros = BankCoreEngine.getInstance()
      .liquidityPositions()
      .filter((p) => country === 'GLOBAL' || p.country === country)
      .map((p) => ({
        nodeId: p.nodeId,
        currency: p.currency as TruthCurrency,
        balance: p.balance,
        settlementAccount: p.settlementAccount,
        updatedAt: p.updatedAt,
      }));

    // ------------------------------------------------------------- entities
    const entities: ExecutiveTruthSnapshot['entities'] = {
      customers: null,
      accounts: null,
      agents: null,
      merchants: null,
      bdcs: null,
    };
    try {
      const customers = CustomerLifecycleEngine.getInstance().getCustomers(
        country === 'GLOBAL' ? undefined : { country },
      );
      entities.customers = customers.length;
      sources.push({ key: 'customers', engine: 'CustomerLifecycleEngine', available: true, records: customers.length });
    } catch {
      /* left null */
    }
    try {
      const accounts = AccountLifecycleEngine.getInstance().getAccounts();
      const scoped = country === 'GLOBAL' ? accounts : accounts.filter((a) => a.country === country);
      entities.accounts = scoped.length;
      sources.push({ key: 'accounts', engine: 'AccountLifecycleEngine', available: true, records: scoped.length });
    } catch {
      /* left null */
    }
    try {
      const agents = AgentManagementEngine.getInstance().getAgents(country === 'GLOBAL' ? undefined : { country });
      entities.agents = agents.length;
      sources.push({ key: 'agents', engine: 'AgentManagementEngine', available: true, records: agents.length });
    } catch {
      /* left null */
    }
    sources.push({
      key: 'merchants',
      engine: '—',
      available: false,
      note: 'no merchant registry engine is wired in this build',
    });
    sources.push({
      key: 'bdcs',
      engine: '—',
      available: false,
      note: 'no BDC operator registry engine is wired in this build',
    });

    // ----------------------------------------------------------- exceptions
    let exceptions: ExecutiveTruthSnapshot['exceptions'] = null;
    try {
      const all = ExceptionEngine.getExceptions();
      const scoped = country === 'GLOBAL' ? all : all.filter((e) => (e as { country?: string }).country === country);
      exceptions = { total: scoped.length, open: scoped.filter((e) => e.status !== 'RESOLVED').length };
      sources.push({ key: 'exceptions', engine: 'ExceptionEngine', available: true, records: scoped.length });
    } catch (err) {
      sources.push({
        key: 'exceptions',
        engine: 'ExceptionEngine',
        available: false,
        note: err instanceof Error ? err.message : 'unavailable',
      });
    }

    // ------------------------------------------------------ pending approvals
    // No maker-checker persistence engine exists in this build. Returning null
    // (and saying so) is deliberate: the console must never open a fabricated
    // authorisation request for a supervisor to "approve".
    const pendingApprovals: ExecutiveTruthSnapshot['pendingApprovals'] = null;
    sources.push({
      key: 'approvals',
      engine: '—',
      available: false,
      note: 'maker–checker queue has no recording engine yet — the console shows no approval items instead of demo ones',
    });
    warnings.push(
      'Maker–checker queue is not wired to a recorder: no approval items are displayed (previously demo requests were shown).',
    );
    warnings.push(
      'Ledger postings and bank-core operations are reported as separate series — bank-core movements also post a journal, so the two must not be added together.',
    );

    // ----------------------------------------------------------------- feed
    const feed: ExecutiveFeedRow[] = [
      ...ledgerTx.slice(0, 20).map((t) => ({
        id: t.id,
        reference: t.transactionReference,
        kind: 'LEDGER_JOURNAL' as const,
        type: t.entries.length > 2 ? `${t.entries.length}-LEG JOURNAL` : 'DOUBLE-ENTRY JOURNAL',
        currency: t.currency as TruthCurrency,
        amount: minorToMajor(t.totalAmount),
        status: t.status === 'COMMITTED' ? 'POSTED' : t.status,
        narration: t.description,
        at: t.postedAt || t.createdAt,
        entries: t.entries.map((e) => ({
          account: e.accountName ?? e.accountId,
          entryType: e.entryType === 'CREDIT' ? ('CREDIT' as const) : ('DEBIT' as const),
          amountMinor: e.amount,
        })),
        source: 'LedgerService',
      })),
      ...bankTx.slice(0, 20).map((t) => ({
        id: t.id,
        reference: t.reference,
        kind: 'BANK_TXN' as const,
        type: t.type,
        currency: t.currency as TruthCurrency,
        amount: t.amount,
        status: t.status,
        narration: t.narration || `${t.type} · ${t.gatewayMode} rail`,
        at: t.createdAt,
        entries: [] as ExecutiveFeedRow['entries'],
        source: 'BankCoreEngine',
      })),
    ]
      .filter((r) => country === 'GLOBAL' || r.currency === (country === 'NG' ? 'NGN' : 'XOF'))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12);

    // -------------------------------------------------------------- headline
    const probed = nodes.filter((n) => n.lastProbe);
    const connected = nodes.filter((n) => n.status === 'CONNECTED');
    const failed = nodes.filter((n) => n.status === 'FAILED');
    const railMode: 'LIVE' | 'SIMULATED' = nodes.some((n) => n.railMode === 'LIVE') ? 'LIVE' : 'SIMULATED';

    let statement: string;
    if (nodes.length === 0) {
      statement =
        'No banking nodes are registered, so rail health is unknown. Register Providus/Coris in Configuration & Automation → Connections, then probe them.';
    } else if (probed.length === 0) {
      statement = `${nodes.length} banking node${nodes.length === 1 ? '' : 's'} registered (${nodes
        .map((n) => `${n.name.split(' ')[0]} ${n.currency === 'NGN' ? NG_RAIL_LABEL : NE_RAIL_LABEL}`)
        .join(', ')}) — none probed yet, so operational status is UNVERIFIED. Liquidity rail: ${railMode}.`;
    } else {
      statement = `${connected.length}/${nodes.length} banking nodes connected at last probe (${probed.length} probed${
        failed.length ? `, ${failed.length} failing` : ''
      }). ${exceptions ? `${exceptions.open} open reconciliation exception(s).` : 'Reconciliation exception count unavailable.'} ${
        pendingApprovals === null ? 'No supervisor approvals are queued (maker–checker not wired).' : ''
      } Liquidity rail: ${railMode}.`;
    }

    return {
      asOf: new Date().toISOString(),
      country,
      headline: {
        nodesTotal: nodes.length,
        nodesConnected: connected.length,
        nodesProbed: probed.length,
        nodesFailed: failed.length,
        railMode,
        statement,
      },
      nodes,
      volumes,
      liquidity: { nostros, walletLiabilityMinor, glLiquidityMinor: glLiquidity },
      entities,
      exceptions,
      pendingApprovals,
      feed,
      sources,
      warnings,
    };
  }
}
