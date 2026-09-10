import {
  LedgerAccount,
  LedgerTransaction,
  LedgerEntry,
  LedgerAccountType,
  CurrencyCode,
  MinorUnitsAmount,
  WalletHold,
} from '@/types/ledger';
import fs from 'fs';
import path from 'path';

const LEDGER_STORE_PATH = process.env.LEDGER_STORE_PATH || '/tmp/korie-ledger-store.json';

// In-memory cluster state representing double-entry ledger accounts
const ledgerAccountsStore = new Map<string, LedgerAccount>();
const ledgerTransactionsStore = new Map<string, LedgerTransaction>();
const ledgerEntriesStore = new Map<string, LedgerEntry[]>();
const walletHoldsStore = new Map<string, WalletHold>();

// Initialize Chart of Accounts (Asset, Liability, Equity, Revenue, Expense)
function buildDefaultChartAccounts(): LedgerAccount[] {
  const defaultAccounts: LedgerAccount[] = [
    // 1. Assets (Providus Bank Nigeria Reserve Node & Coris Bank Niger Reserve Node)
    {
      id: 'acc_asset_providus_ngn',
      orgId: 'org_kor_99182',
      accountNumber: '1010-PROV-NGN-POOL',
      name: 'Providus Bank Nigeria NIP Settlement Clearing Pool',
      type: 'ASSET',
      currency: 'NGN',
      country: 'NG',
      balance: 50000000000, // ₦500,000,000.00 minor units
      lockedBalance: 0,
      availableBalance: 50000000000,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    {
      id: 'acc_asset_koris_xof',
      orgId: 'org_kor_99182',
      accountNumber: '1020-KORIS-XOF-POOL',
      name: 'Coris Bank Niger Republic WAEMU Liquidity Pool',
      type: 'ASSET',
      currency: 'XOF',
      country: 'NE',
      balance: 215000000000, // 215,000,000 CFA minor units
      lockedBalance: 0,
      availableBalance: 215000000000,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    // 2. Liabilities (Customer Wallets & Merchant Escrow)
    {
      id: 'acc_liab_customer_wallets_ngn',
      orgId: 'org_kor_99182',
      accountNumber: '2010-CUST-WALLETS-NGN',
      name: 'Customer & Merchant Wallet Liability (NGN)',
      type: 'LIABILITY',
      currency: 'NGN',
      country: 'NG',
      balance: 85000000, // ₦850,000.00
      lockedBalance: 500000,
      availableBalance: 84500000,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    {
      id: 'acc_liab_customer_wallets_xof',
      orgId: 'org_kor_99182',
      accountNumber: '2020-CUST-WALLETS-XOF',
      name: 'Customer & Merchant Wallet Liability (XOF)',
      type: 'LIABILITY',
      currency: 'XOF',
      country: 'NE',
      balance: 420000000, // 420,000 CFA
      lockedBalance: 0,
      availableBalance: 420000000,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    // 3. Revenues (Transaction Fees & FX Margins)
    {
      id: 'acc_rev_tx_fees_ngn',
      orgId: 'org_kor_99182',
      accountNumber: '4010-REV-TX-FEES-NGN',
      name: 'KoriePay Transaction & Switch Fee Revenue (NGN)',
      type: 'REVENUE',
      currency: 'NGN',
      country: 'NG',
      balance: 14200000,
      lockedBalance: 0,
      availableBalance: 14200000,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    // 4. Expenses (Provider Network & NIP Clearing Costs)
    {
      id: 'acc_exp_prov_costs_ngn',
      orgId: 'org_kor_99182',
      accountNumber: '5010-EXP-PROV-NIP-FEES',
      name: 'Providus & NIBSS Network Switch Expense (NGN)',
      type: 'EXPENSE',
      currency: 'NGN',
      country: 'NG',
      balance: 4500000,
      lockedBalance: 0,
      availableBalance: 4500000,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    // 5. Adashi / Ajo Escrow Pools (customer contribution custody)
    {
      id: 'acc_liab_adashi_escrow_ngn',
      orgId: 'org_kor_99182',
      accountNumber: '2020-ADASHI-ESCROW-NGN',
      name: 'Adashi / Ajo Contribution Escrow Pool (NGN)',
      type: 'LIABILITY',
      currency: 'NGN',
      country: 'NG',
      balance: 0,
      lockedBalance: 0,
      availableBalance: 0,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    {
      id: 'acc_liab_adashi_escrow_xof',
      orgId: 'org_kor_99182',
      accountNumber: '2021-ADASHI-ESCROW-XOF',
      name: 'Adashi / Ajo Contribution Escrow Pool (XOF)',
      type: 'LIABILITY',
      currency: 'XOF',
      country: 'NE',
      balance: 0,
      lockedBalance: 0,
      availableBalance: 0,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    // 6b. Agency Banking Float Liabilities (agent e-float custody)
    {
      id: 'acc_liab_agent_floats_ngn',
      orgId: 'org_kor_99182',
      accountNumber: '2110-AGENT-FLOATS-NGN',
      name: 'Agency Banking Agent Float Liabilities (NGN)',
      type: 'LIABILITY',
      currency: 'NGN',
      country: 'NG',
      balance: 185000000, // ₦1,850,000.00 minor units (registry seed for agt-ng-001)
      lockedBalance: 0,
      availableBalance: 185000000,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    // 6. Agent Cash Collections in Transit (offline agent Adashi collections)
    {
      id: 'acc_asset_agent_cash_ngn',
      orgId: 'org_kor_99182',
      accountNumber: '1030-AGENT-CASH-NGN',
      name: 'Agent Cash Collections in Transit (NGN)',
      type: 'ASSET',
      currency: 'NGN',
      country: 'NG',
      balance: 0,
      lockedBalance: 0,
      availableBalance: 0,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    {
      id: 'acc_asset_agent_cash_xof',
      orgId: 'org_kor_99182',
      accountNumber: '1031-AGENT-CASH-XOF',
      name: 'Agent Cash Collections in Transit (XOF)',
      type: 'ASSET',
      currency: 'XOF',
      country: 'NE',
      balance: 0,
      lockedBalance: 0,
      availableBalance: 0,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    // 7. Agent product services (Stage 4) — biller settlements, commissions payable
    {
      id: 'acc_liab_biller_settlements_ngn',
      orgId: 'org_kor_99182',
      accountNumber: '2120-BILLER-SETTLE-NGN',
      name: 'Biller Settlement Payables (NGN) — agent bill payments to remit',
      type: 'LIABILITY',
      currency: 'NGN',
      country: 'NG',
      balance: 0,
      lockedBalance: 0,
      availableBalance: 0,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    {
      id: 'acc_liab_agent_commissions_payable_ngn',
      orgId: 'org_kor_99182',
      accountNumber: '2130-AGENT-COMM-PAY-NGN',
      name: 'Agent Commissions Payable (NGN) — accrued 60/40 product splits',
      type: 'LIABILITY',
      currency: 'NGN',
      country: 'NG',
      balance: 0,
      lockedBalance: 0,
      availableBalance: 0,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    // 8. FX corridor desk (NGN legs only; XOF legs settle in treasury corridor float)
    {
      id: 'acc_liab_fx_corridor_payable_ngn',
      orgId: 'org_kor_99182',
      accountNumber: '2140-FX-CORRIDOR-PAY-NGN',
      name: 'FX Corridor Payable (NGN) — naira owed to corridor float for XOF sold',
      type: 'LIABILITY',
      currency: 'NGN',
      country: 'NG',
      balance: 0,
      lockedBalance: 0,
      availableBalance: 0,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    {
      id: 'acc_asset_fx_corridor_advance_ngn',
      orgId: 'org_kor_99182',
      accountNumber: '1040-FX-CORRIDOR-ADV-NGN',
      name: 'FX Corridor Advance (NGN) — till cash advanced awaiting corridor reimbursement',
      type: 'ASSET',
      currency: 'NGN',
      country: 'NG',
      balance: 0,
      lockedBalance: 0,
      availableBalance: 0,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    // 9. Bank Core (settlement nostros) — money the platform holds at partner
    // banks (Providus NG / Coris NE); the Bank Core API moves these as the
    // liquidity rail behind wallet float and outbound clearing.
    {
      id: 'acc_asset_bank_settlement_ngn',
      orgId: 'org_kor_99182',
      accountNumber: '1010-BANK-SETTLE-NGN',
      name: 'Bank Settlement Nostro (NGN) — partner bank settlement account',
      type: 'ASSET',
      currency: 'NGN',
      country: 'NG',
      balance: 0,
      lockedBalance: 0,
      availableBalance: 0,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    {
      id: 'acc_asset_bank_settlement_xof',
      orgId: 'org_kor_99182',
      accountNumber: '1020-BANK-SETTLE-XOF',
      name: 'Bank Settlement Nostro (XOF) — partner bank settlement account (BCEAO zone)',
      type: 'ASSET',
      currency: 'XOF',
      country: 'NE',
      balance: 0,
      lockedBalance: 0,
      availableBalance: 0,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
  ];

  return defaultAccounts;
}

function ensureChartAccountsPresent() {
  for (const acc of buildDefaultChartAccounts()) {
    if (!ledgerAccountsStore.has(acc.id)) ledgerAccountsStore.set(acc.id, acc);
  }
}

function initializeDefaultChartOfAccounts() {
  if (ledgerAccountsStore.size === 0) {
    for (const acc of buildDefaultChartAccounts()) {
      ledgerAccountsStore.set(acc.id, acc);
    }
  } else {
    ensureChartAccountsPresent();
  }
}

function hydrateLedgerStore() {
  try {
    if (!fs.existsSync(LEDGER_STORE_PATH)) return;
    const data = JSON.parse(fs.readFileSync(LEDGER_STORE_PATH, 'utf8'));
    if (data.accounts) {
      ledgerAccountsStore.clear();
      data.accounts.forEach((acc: LedgerAccount) => ledgerAccountsStore.set(acc.id, acc));
    }
    if (data.transactions) {
      ledgerTransactionsStore.clear();
      data.transactions.forEach((tx: LedgerTransaction) => ledgerTransactionsStore.set(tx.id, tx));
    }
    if (data.entries) {
      ledgerEntriesStore.clear();
      data.entries.forEach((en: LedgerEntry[]) => {
        if (en.length > 0) ledgerEntriesStore.set(en[0].transactionId, en);
      });
    }
    if (data.holds) {
      walletHoldsStore.clear();
      data.holds.forEach((h: WalletHold) => walletHoldsStore.set(h.id, h));
    }
  } catch {
    /* corrupt/missing store — keep chart seeds */
  }
}

function persistLedgerStore() {
  try {
    fs.mkdirSync(path.dirname(LEDGER_STORE_PATH), { recursive: true });
    fs.writeFileSync(
      LEDGER_STORE_PATH,
      JSON.stringify({
        accounts: Array.from(ledgerAccountsStore.values()),
        transactions: Array.from(ledgerTransactionsStore.values()),
        entries: Array.from(ledgerEntriesStore.values()),
        holds: Array.from(walletHoldsStore.values()),
      }),
    );
  } catch {
    /* non-fatal */
  }
}

hydrateLedgerStore();
initializeDefaultChartOfAccounts();

export class LedgerService {
  /**
   * Retrieves an account from chart of accounts
   */
  static async getAccount(accountId: string): Promise<LedgerAccount | null> {
    initializeDefaultChartOfAccounts();
    return ledgerAccountsStore.get(accountId) || null;
  }

  /**
   * Read-only projections of the posted ledger (truth surface for executive
   * reporting). These re-hydrate from the store file first so they reflect
   * every journal this deployment has committed. No mutation, no estimates:
   * what is returned is exactly what was posted.
   */
  static listTransactions(limit?: number): LedgerTransaction[] {
    hydrateLedgerStore();
    initializeDefaultChartOfAccounts();
    const all = Array.from(ledgerTransactionsStore.values()).sort(
      (a, b) => new Date(b.postedAt || b.createdAt).getTime() - new Date(a.postedAt || a.createdAt).getTime(),
    );
    return typeof limit === 'number' ? all.slice(0, limit) : all;
  }

  static listAccounts(): LedgerAccount[] {
    hydrateLedgerStore();
    initializeDefaultChartOfAccounts();
    return Array.from(ledgerAccountsStore.values());
  }

  static listHolds(): WalletHold[] {
    hydrateLedgerStore();
    return Array.from(walletHoldsStore.values());
  }

  /**
   * Posts an atomic double-entry ledger transaction.
   * STRICT RULE: SUM(DEBIT) MUST EQUAL SUM(CREDIT)
   */
  static async postTransaction(params: {
    orgId: string;
    transactionReference: string;
    externalReference?: string;
    description: string;
    currency: CurrencyCode;
    entries: {
      accountId: string;
      entryType: 'DEBIT' | 'CREDIT';
      amount: MinorUnitsAmount;
      narration: string;
    }[];
  }): Promise<{ transaction: LedgerTransaction; entries: LedgerEntry[] }> {
    initializeDefaultChartOfAccounts();

    if (!params.entries || params.entries.length < 2) {
      throw new Error('LEDGER_INVALID_ENTRIES: Double-entry transactions require at least 2 entries (one debit, one credit).');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of params.entries) {
      if (entry.amount <= 0 || !Number.isInteger(entry.amount)) {
        throw new Error(`LEDGER_INVALID_AMOUNT: Entry amount must be a positive integer in minor currency units (received: ${entry.amount})`);
      }

      const acc = ledgerAccountsStore.get(entry.accountId);
      if (!acc) {
        throw new Error(`LEDGER_ACCOUNT_NOT_FOUND: Account ID ${entry.accountId} does not exist in chart of accounts.`);
      }

      if (entry.entryType === 'DEBIT') totalDebit += entry.amount;
      if (entry.entryType === 'CREDIT') totalCredit += entry.amount;
    }

    // Mathematical Double-Entry Balancing Check
    if (totalDebit !== totalCredit) {
      throw new Error(`LEDGER_IMBALANCE_DETECTED: Total debits (${totalDebit}) must equal total credits (${totalCredit}). Net difference: ${totalDebit - totalCredit}`);
    }

    const txId = `ltx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdEntries: LedgerEntry[] = [];

    // Apply Debits and Credits Atomically
    for (const entry of params.entries) {
      const acc = ledgerAccountsStore.get(entry.accountId)!;

      // Update account balance based on accounting equation rules:
      // Asset / Expense: Increases with DEBIT, decreases with CREDIT
      // Liability / Equity / Revenue: Increases with CREDIT, decreases with DEBIT
      if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
        if (entry.entryType === 'DEBIT') {
          acc.balance += entry.amount;
        } else {
          acc.balance -= entry.amount;
        }
      } else {
        if (entry.entryType === 'CREDIT') {
          acc.balance += entry.amount;
        } else {
          acc.balance -= entry.amount;
        }
      }

      acc.availableBalance = acc.balance - acc.lockedBalance;
      acc.updatedAt = new Date().toISOString();
      ledgerAccountsStore.set(acc.id, acc);

      const newEntry: LedgerEntry = {
        id: `lent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        transactionId: txId,
        accountId: acc.id,
        accountName: acc.name,
        entryType: entry.entryType,
        amount: entry.amount,
        currency: params.currency,
        narration: entry.narration,
        createdAt: new Date().toISOString(),
      };

      createdEntries.push(newEntry);
    }

    const ledgerTx: LedgerTransaction = {
      id: txId,
      orgId: params.orgId,
      transactionReference: params.transactionReference,
      externalReference: params.externalReference,
      description: params.description,
      totalAmount: totalDebit,
      currency: params.currency,
      status: 'COMMITTED',
      entries: createdEntries,
      postedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    ledgerTransactionsStore.set(txId, ledgerTx);
    ledgerEntriesStore.set(txId, createdEntries);
    persistLedgerStore();

    return { transaction: ledgerTx, entries: createdEntries };
  }

  /**
   * Places an escrow hold on an account's balance
   */
  static async placeHold(params: {
    walletId: string;
    accountId: string;
    amount: MinorUnitsAmount;
    currency: CurrencyCode;
    reason: string;
    reference: string;
    ttlMinutes?: number;
  }): Promise<WalletHold> {
    initializeDefaultChartOfAccounts();
    const acc = ledgerAccountsStore.get(params.accountId);
    if (!acc) throw new Error('Account not found');

    if (acc.availableBalance < params.amount) {
      throw new Error(`INSUFFICIENT_AVAILABLE_FUNDS: Available balance (${acc.availableBalance}) is less than required hold (${params.amount})`);
    }

    acc.lockedBalance += params.amount;
    acc.availableBalance = acc.balance - acc.lockedBalance;
    acc.updatedAt = new Date().toISOString();
    ledgerAccountsStore.set(acc.id, acc);

    const hold: WalletHold = {
      id: `hold_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      walletId: params.walletId,
      accountId: params.accountId,
      amount: params.amount,
      currency: params.currency,
      reason: params.reason,
      reference: params.reference,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + (params.ttlMinutes || 15) * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    walletHoldsStore.set(hold.id, hold);
    persistLedgerStore();
    return hold;
  }
}
