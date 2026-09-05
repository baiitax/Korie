import { 
  JournalEntry, 
  JournalLine, 
  AccountBalanceProjection, 
  TrialBalanceReport 
} from '@/types/financialEngine';
import { CHART_OF_ACCOUNTS, getAllAccounts, getAccountByCode } from './ChartOfAccounts';

export class DoubleEntryLedgerEngine {
  private static journalStore: Map<string, JournalEntry> = new Map();
  private static balanceCache: Map<string, AccountBalanceProjection> = new Map();
  private static isInitialized = false;

  public static ensureInitialized(): void {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.rebuildAccountBalances();
      this.seedInitialLedgerData();
    }
  }

  private static seedInitialLedgerData(): void {
    if (this.journalStore.size > 0) return;

    // 1. Initial Bank Settlement Pool Funding
    this.postJournalEntry({
      journalNumber: 'JE-2026-0901-0001',
      ruleCode: 'RULE_EQUITY_CAPITALIZATION',
      ruleVersion: 'v1',
      description: 'Initial Operating Liquidity Injection - Providus Bank Nigeria',
      currency: 'NGN',
      totalDebit: 150_000_000_00,
      totalCredit: 150_000_000_00,
      lines: [
        {
          id: 'jl_seed_1',
          journalEntryId: '',
          accountCode: '1010',
          accountName: 'Providus Settlement Pool NGN',
          category: 'ASSET',
          direction: 'DEBIT',
          debitAmount: 150_000_000_00,
          creditAmount: 0,
          currency: 'NGN',
          narration: 'Providus Pool Liquidity',
          dimension: { country: 'NG', currency: 'NGN' },
          createdAt: '2026-09-01T08:00:00Z',
        },
        {
          id: 'jl_seed_2',
          journalEntryId: '',
          accountCode: '3010',
          accountName: 'Retained Platform Earnings',
          category: 'EQUITY',
          direction: 'CREDIT',
          debitAmount: 0,
          creditAmount: 150_000_000_00,
          currency: 'NGN',
          narration: 'Capitalization Equity Reserve',
          dimension: { country: 'CROSS_BORDER', currency: 'NGN' },
          createdAt: '2026-09-01T08:00:00Z',
        },
      ],
      effectiveAt: '2026-09-01T08:00:00Z',
      createdBy: 'TREASURY_OPS_HEAD',
      sourceSystem: 'KORIEPAY_TREASURY',
      sourceReference: 'TR-INIT-NGN-001',
    });

    // 2. Initial Coris Bank Niger Liquidity
    this.postJournalEntry({
      journalNumber: 'JE-2026-0901-0002',
      ruleCode: 'RULE_EQUITY_CAPITALIZATION',
      ruleVersion: 'v1',
      description: 'Initial Operating Liquidity Injection - Coris Bank Niger Republic',
      currency: 'XOF',
      totalDebit: 75_000_000_00,
      totalCredit: 75_000_000_00,
      lines: [
        {
          id: 'jl_seed_3',
          journalEntryId: '',
          accountCode: '1020',
          accountName: 'Coris Bank Settlement Pool XOF',
          category: 'ASSET',
          direction: 'DEBIT',
          debitAmount: 75_000_000_00,
          creditAmount: 0,
          currency: 'XOF',
          narration: 'Coris Bank Settlement Float',
          dimension: { country: 'NE', currency: 'XOF' },
          createdAt: '2026-09-01T08:30:00Z',
        },
        {
          id: 'jl_seed_4',
          journalEntryId: '',
          accountCode: '3010',
          accountName: 'Retained Platform Earnings',
          category: 'EQUITY',
          direction: 'CREDIT',
          debitAmount: 0,
          creditAmount: 75_000_000_00,
          currency: 'XOF',
          narration: 'Capitalization Equity Reserve XOF',
          dimension: { country: 'CROSS_BORDER', currency: 'XOF' },
          createdAt: '2026-09-01T08:30:00Z',
        },
      ],
      effectiveAt: '2026-09-01T08:30:00Z',
      createdBy: 'TREASURY_OPS_HEAD',
      sourceSystem: 'KORIEPAY_TREASURY',
      sourceReference: 'TR-INIT-XOF-001',
    });

    // 3. Customer Deposits (NIP Inbound Collections)
    this.postJournalEntry({
      journalNumber: 'JE-2026-0902-0001',
      ruleCode: 'RULE_CUSTOMER_DEPOSIT_NGN',
      ruleVersion: 'v1',
      description: 'Direct NIP Inbound Virtual Account Collections Batch',
      currency: 'NGN',
      totalDebit: 42_500_000_00,
      totalCredit: 42_500_000_00,
      lines: [
        {
          id: 'jl_seed_5',
          journalEntryId: '',
          accountCode: '1010',
          accountName: 'Providus Settlement Pool NGN',
          category: 'ASSET',
          direction: 'DEBIT',
          debitAmount: 42_500_000_00,
          creditAmount: 0,
          currency: 'NGN',
          narration: 'Providus NIP Collections Inflow',
          dimension: { country: 'NG', currency: 'NGN' },
          createdAt: '2026-09-02T10:00:00Z',
        },
        {
          id: 'jl_seed_6',
          journalEntryId: '',
          accountCode: '2010',
          accountName: 'Customer Wallet Deposits NGN',
          category: 'LIABILITY',
          direction: 'CREDIT',
          debitAmount: 0,
          creditAmount: 42_500_000_00,
          currency: 'NGN',
          narration: 'Customer Wallet Credit Allocations',
          dimension: { country: 'NG', currency: 'NGN' },
          createdAt: '2026-09-02T10:00:00Z',
        },
      ],
      effectiveAt: '2026-09-02T10:00:00Z',
      createdBy: 'NIP_WEBHOOK_DAEMON',
      sourceSystem: 'KORIEPAY_NIP_GATEWAY',
      sourceReference: 'NIP-BATCH-20260902',
    });

    // 4. Merchant Checkout Collection with MDR Fee
    this.postJournalEntry({
      journalNumber: 'JE-2026-0902-0002',
      ruleCode: 'RULE_MERCHANT_CHECKOUT_NGN_v1',
      ruleVersion: 'v1',
      description: 'Merchant E-Commerce Gateway Collections with 1.5% MDR deduction',
      currency: 'NGN',
      totalDebit: 18_400_000_00,
      totalCredit: 18_400_000_00,
      lines: [
        {
          id: 'jl_seed_7',
          journalEntryId: '',
          accountCode: '1010',
          accountName: 'Providus Settlement Pool NGN',
          category: 'ASSET',
          direction: 'DEBIT',
          debitAmount: 18_400_000_00,
          creditAmount: 0,
          currency: 'NGN',
          narration: 'Card Aggregator Gross Inflow',
          dimension: { country: 'NG', currency: 'NGN' },
          createdAt: '2026-09-02T14:15:00Z',
        },
        {
          id: 'jl_seed_8',
          journalEntryId: '',
          accountCode: '2050',
          accountName: 'Merchant Payables NGN',
          category: 'LIABILITY',
          direction: 'CREDIT',
          debitAmount: 0,
          creditAmount: 18_124_000_00,
          currency: 'NGN',
          narration: 'Merchant Net Payable Accrual',
          dimension: { country: 'NG', currency: 'NGN' },
          createdAt: '2026-09-02T14:15:00Z',
        },
        {
          id: 'jl_seed_9',
          journalEntryId: '',
          accountCode: '4030',
          accountName: 'Merchant MDR Checkout Fee Income',
          category: 'REVENUE',
          direction: 'CREDIT',
          debitAmount: 0,
          creditAmount: 276_000_00,
          currency: 'NGN',
          narration: 'Platform MDR Take (1.5%)',
          dimension: { country: 'NG', currency: 'NGN' },
          createdAt: '2026-09-02T14:15:00Z',
        },
      ],
      effectiveAt: '2026-09-02T14:15:00Z',
      createdBy: 'CHECKOUT_PROCESSING_DAEMON',
      sourceSystem: 'KORIEPAY_CHECKOUT',
      sourceReference: 'CHK-AGG-20260902',
    });

    // 5. Suspense Unallocated Inbound
    this.postJournalEntry({
      journalNumber: 'JE-2026-0902-0003',
      ruleCode: 'RULE_SUSPENSE_HOLD_v1',
      ruleVersion: 'v1',
      description: 'Unallocated Direct NIP Deposit Suspense Isolation',
      currency: 'NGN',
      totalDebit: 450_000_00,
      totalCredit: 450_000_00,
      lines: [
        {
          id: 'jl_seed_10',
          journalEntryId: '',
          accountCode: '1010',
          accountName: 'Providus Settlement Pool NGN',
          category: 'ASSET',
          direction: 'DEBIT',
          debitAmount: 450_000_00,
          creditAmount: 0,
          currency: 'NGN',
          narration: 'Unmatched Inbound Bank Credit',
          dimension: { country: 'NG', currency: 'NGN' },
          createdAt: '2026-09-02T16:00:00Z',
        },
        {
          id: 'jl_seed_11',
          journalEntryId: '',
          accountCode: '7100',
          accountName: 'Unallocated Inbound NIP Deposits Suspense',
          category: 'SUSPENSE',
          direction: 'CREDIT',
          debitAmount: 0,
          creditAmount: 450_000_00,
          currency: 'NGN',
          narration: 'Suspense Isolation Pending Investigation',
          dimension: { country: 'NG', currency: 'NGN' },
          createdAt: '2026-09-02T16:00:00Z',
        },
      ],
      effectiveAt: '2026-09-02T16:00:00Z',
      createdBy: 'RECONCILIATION_DAEMON',
      sourceSystem: 'KORIEPAY_RECON_ENGINE',
      sourceReference: 'NIP-UNALLOC-0902',
    });
  }

  /**
   * Post a balanced journal entry to the immutable ledger.
   */
  public static postJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'postedAt' | 'status'> & { id?: string }): JournalEntry {
    const journalId = entry.id || `je_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // 1. Strict Invariant: Total Debits must equal Total Credits
    const totalDebit = entry.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredit = entry.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);

    if (totalDebit !== totalCredit) {
      throw new Error(`Double-entry violation: Total Debits (${totalDebit}) must equal Total Credits (${totalCredit})`);
    }

    if (totalDebit <= 0) {
      throw new Error(`Journal entry must have a non-zero financial value`);
    }

    // 2. Validate all lines
    for (const line of entry.lines) {
      if (!Number.isInteger(line.debitAmount) || !Number.isInteger(line.creditAmount)) {
        throw new Error(`Fractional currency amounts are strictly prohibited. Amounts must be integer minor units.`);
      }
      if (line.debitAmount < 0 || line.creditAmount < 0) {
        throw new Error(`Negative amounts are prohibited in journal lines. Use opposite direction.`);
      }
      if (line.direction === 'DEBIT' && (line.debitAmount <= 0 || line.creditAmount !== 0)) {
        throw new Error(`Invalid line configuration for DEBIT line on account ${line.accountCode}`);
      }
      if (line.direction === 'CREDIT' && (line.creditAmount <= 0 || line.debitAmount !== 0)) {
        throw new Error(`Invalid line configuration for CREDIT line on account ${line.accountCode}`);
      }
      if (!getAccountByCode(line.accountCode)) {
        throw new Error(`Account code ${line.accountCode} does not exist in the Chart of Accounts.`);
      }
    }

    const postedEntry: JournalEntry = {
      ...entry,
      id: journalId,
      totalDebit,
      totalCredit,
      status: 'POSTED',
      createdAt: now,
      postedAt: now,
      lines: entry.lines.map((l, idx) => ({
        ...l,
        id: l.id || `jl_${journalId}_${idx + 1}`,
        journalEntryId: journalId,
        createdAt: now,
      })),
    };

    // Store immutable journal
    this.journalStore.set(journalId, postedEntry);

    // Apply journal lines to derived balance cache
    this.applyEntryToBalances(postedEntry);

    return postedEntry;
  }

  /**
   * Reverse an existing journal entry with exact compensating journal lines.
   */
  public static reverseJournalEntry(params: {
    originalJournalId: string;
    reversalReason: string;
    operator: string;
  }): JournalEntry {
    const original = this.journalStore.get(params.originalJournalId);
    if (!original) {
      throw new Error(`Original journal ${params.originalJournalId} not found.`);
    }
    if (original.status === 'REVERSED') {
      throw new Error(`Journal ${params.originalJournalId} has already been reversed.`);
    }

    const reversalNumber = `REV-${original.journalNumber}`;
    const reversalLines: JournalLine[] = original.lines.map((line, idx) => {
      const isDebit = line.direction === 'DEBIT';
      return {
        id: `jl_rev_${Date.now()}_${idx}`,
        journalEntryId: '',
        accountCode: line.accountCode,
        accountName: line.accountName,
        category: line.category,
        direction: isDebit ? 'CREDIT' : 'DEBIT',
        debitAmount: isDebit ? 0 : line.creditAmount,
        creditAmount: isDebit ? line.debitAmount : 0,
        currency: line.currency,
        narration: `Reversal of ${original.journalNumber}: ${params.reversalReason}`,
        dimension: line.dimension,
        createdAt: new Date().toISOString(),
      };
    });

    const reversalEntry = this.postJournalEntry({
      journalNumber: reversalNumber,
      ruleCode: original.ruleCode,
      ruleVersion: original.ruleVersion,
      description: `Reversal of ${original.journalNumber}: ${params.reversalReason}`,
      currency: original.currency,
      totalDebit: original.totalDebit,
      totalCredit: original.totalCredit,
      lines: reversalLines,
      effectiveAt: new Date().toISOString(),
      createdBy: params.operator,
      sourceSystem: 'KORIEPAY_REVERSAL_ENGINE',
      sourceReference: original.journalNumber,
    });

    // Mark original as reversed
    original.status = 'REVERSED';
    original.reversalJournalId = reversalEntry.id;
    this.journalStore.set(original.id, original);

    return reversalEntry;
  }

  /**
   * Rebuild all derived account balances from scratch by replaying all posted journal lines.
   */
  public static rebuildAccountBalances(): Map<string, AccountBalanceProjection> {
    const newBalances = new Map<string, AccountBalanceProjection>();

    // Initialize all chart accounts
    for (const acc of getAllAccounts()) {
      newBalances.set(acc.code, {
        accountCode: acc.code,
        accountName: acc.name,
        category: acc.category,
        currency: acc.currency === 'MULTI' ? 'NGN' : acc.currency,
        country: acc.country,
        postedDebitTotal: 0,
        postedCreditTotal: 0,
        calculatedBalance: 0,
        lockedHolds: 0,
        availableBalance: 0,
        lastJournalId: '',
        lastRebuiltAt: new Date().toISOString(),
        isBalanced: true,
      });
    }

    // Iterate through all posted journal entries
    for (const entry of Array.from(this.journalStore.values())) {
      if (entry.status !== 'POSTED' && entry.status !== 'REVERSED') continue;

      for (const line of entry.lines) {
        const projection = newBalances.get(line.accountCode);
        if (projection) {
          projection.postedDebitTotal += line.debitAmount;
          projection.postedCreditTotal += line.creditAmount;
          projection.lastJournalId = entry.id;

          // Compute balance according to normal balance category
          const isDebitNormal = ['ASSET', 'EXPENSE', 'CONTROL', 'CLEARING'].includes(projection.category);
          if (isDebitNormal) {
            projection.calculatedBalance = projection.postedDebitTotal - projection.postedCreditTotal;
          } else {
            projection.calculatedBalance = projection.postedCreditTotal - projection.postedDebitTotal;
          }
          projection.availableBalance = projection.calculatedBalance - projection.lockedHolds;
        }
      }
    }

    this.balanceCache = newBalances;
    return this.balanceCache;
  }

  private static applyEntryToBalances(entry: JournalEntry): void {
    for (const line of entry.lines) {
      let projection = this.balanceCache.get(line.accountCode);
      if (!projection) {
        const acc = getAccountByCode(line.accountCode);
        if (!acc) continue;
        projection = {
          accountCode: acc.code,
          accountName: acc.name,
          category: acc.category,
          currency: acc.currency === 'MULTI' ? 'NGN' : acc.currency,
          country: acc.country,
          postedDebitTotal: 0,
          postedCreditTotal: 0,
          calculatedBalance: 0,
          lockedHolds: 0,
          availableBalance: 0,
          lastJournalId: entry.id,
          lastRebuiltAt: new Date().toISOString(),
          isBalanced: true,
        };
        this.balanceCache.set(line.accountCode, projection);
      }

      projection.postedDebitTotal += line.debitAmount;
      projection.postedCreditTotal += line.creditAmount;
      projection.lastJournalId = entry.id;

      const isDebitNormal = ['ASSET', 'EXPENSE', 'CONTROL', 'CLEARING'].includes(projection.category);
      if (isDebitNormal) {
        projection.calculatedBalance = projection.postedDebitTotal - projection.postedCreditTotal;
      } else {
        projection.calculatedBalance = projection.postedCreditTotal - projection.postedDebitTotal;
      }
      projection.availableBalance = projection.calculatedBalance - projection.lockedHolds;
      projection.lastRebuiltAt = new Date().toISOString();
    }
  }

  public static getAccountBalance(accountCode: string): AccountBalanceProjection | undefined {
    this.ensureInitialized();
    return this.balanceCache.get(accountCode);
  }

  public static getAllBalances(): AccountBalanceProjection[] {
    this.ensureInitialized();
    return Array.from(this.balanceCache.values());
  }

  public static getJournals(filter?: { accountCode?: string; limit?: number }): JournalEntry[] {
    this.ensureInitialized();
    const list = Array.from(this.journalStore.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (!filter) return list;
    if (filter.accountCode) {
      return list.filter(j => j.lines.some(l => l.accountCode === filter.accountCode));
    }
    return filter.limit ? list.slice(0, filter.limit) : list;
  }

  /**
   * Generates authoritative Trial Balance report.
   */
  public static generateTrialBalance(currency: 'NGN' | 'XOF' = 'NGN'): TrialBalanceReport {
    this.ensureInitialized();
    
    // Compute exact balances from journal lines for this specific currency
    const accountTotals = new Map<string, { debit: number; credit: number }>();
    for (const acc of getAllAccounts()) {
      accountTotals.set(acc.code, { debit: 0, credit: 0 });
    }

    for (const entry of Array.from(this.journalStore.values())) {
      if (entry.status !== 'POSTED' && entry.status !== 'REVERSED') continue;
      if (entry.currency !== currency) continue;

      for (const line of entry.lines) {
        if (line.currency !== currency) continue;
        const tot = accountTotals.get(line.accountCode);
        if (tot) {
          tot.debit += line.debitAmount;
          tot.credit += line.creditAmount;
        }
      }
    }

    let totalDebits = 0;
    let totalCredits = 0;
    const accounts: {
      code: string;
      name: string;
      category: any;
      debitBalance: number;
      creditBalance: number;
    }[] = [];

    for (const acc of getAllAccounts()) {
      const tot = accountTotals.get(acc.code)!;
      const isDebitNormal = ['ASSET', 'EXPENSE', 'CONTROL', 'CLEARING'].includes(acc.category);
      
      let debitBal = 0;
      let creditBal = 0;

      if (isDebitNormal) {
        const net = tot.debit - tot.credit;
        if (net >= 0) {
          debitBal = net;
        } else {
          creditBal = Math.abs(net);
        }
      } else {
        const net = tot.credit - tot.debit;
        if (net >= 0) {
          creditBal = net;
        } else {
          debitBal = Math.abs(net);
        }
      }

      totalDebits += debitBal;
      totalCredits += creditBal;

      accounts.push({
        code: acc.code,
        name: acc.name,
        category: acc.category,
        debitBalance: debitBal,
        creditBalance: creditBal,
      });
    }

    return {
      asOfDate: new Date().toISOString(),
      reportingCurrency: currency,
      accounts,
      totalDebits,
      totalCredits,
      isBalanced: totalDebits === totalCredits,
    };
  }
}
