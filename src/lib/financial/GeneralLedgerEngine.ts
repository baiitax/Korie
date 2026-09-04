// Tier-1 Multi-Dimensional General Ledger Engine with Double-Entry Invariant

import {
  GLAccount,
  GLJournal,
  GLJournalLine,
  AccountingPeriod,
} from '@/types/financeGlEngine';

export class GeneralLedgerEngine {
  private static instance: GeneralLedgerEngine;

  private accounts: Map<string, GLAccount> = new Map();
  private journals: GLJournal[] = [];
  private periods: AccountingPeriod[] = [
    {
      id: 'period-2026-09',
      periodName: '2026-09',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      fiscalYear: 2026,
      fiscalMonth: 9,
      status: 'OPEN',
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'period-2026-08',
      periodName: '2026-08',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      fiscalYear: 2026,
      fiscalMonth: 8,
      status: 'LOCKED',
      closedAt: '2026-08-31T23:59:59Z',
      lockedAt: '2026-09-01T04:00:00Z',
      createdAt: '2026-08-01T00:00:00Z',
    },
  ];

  private constructor() {
    this.initializeDefaultAccounts();
    this.initializeSeedJournals();
  }

  public static getInstance(): GeneralLedgerEngine {
    if (!GeneralLedgerEngine.instance) {
      GeneralLedgerEngine.instance = new GeneralLedgerEngine();
    }
    return GeneralLedgerEngine.instance;
  }

  private initializeDefaultAccounts() {
    const defaultAccounts: GLAccount[] = [
      {
        id: 'acc-1010',
        accountCode: '1010',
        accountName: 'Providus Settlement Pool NGN',
        category: 'ASSET',
        normalBalance: 'DEBIT',
        currency: 'NGN',
        isSubledgerControl: true,
        subledgerType: 'PROVIDER_CLEARING',
        isActive: true,
        allowManualPosting: false,
        description: 'Operational bank pool at Providus Bank NG',
        currentBalance: 145000000.0,
      },
      {
        id: 'acc-1020',
        accountCode: '1020',
        accountName: 'Koris Settlement Pool XOF',
        category: 'ASSET',
        normalBalance: 'DEBIT',
        currency: 'XOF',
        isSubledgerControl: true,
        subledgerType: 'PROVIDER_CLEARING',
        isActive: true,
        allowManualPosting: false,
        description: 'Operational bank pool at Koris Bank Niger SA',
        currentBalance: 88500000.0,
      },
      {
        id: 'acc-1100',
        accountCode: '1100',
        accountName: 'Customer Inward Collections Clearing NGN',
        category: 'CLEARING',
        normalBalance: 'DEBIT',
        currency: 'NGN',
        isSubledgerControl: false,
        isActive: true,
        allowManualPosting: false,
        description: 'In-flight virtual account collections clearing',
        currentBalance: 0.0,
      },
      {
        id: 'acc-2010',
        accountCode: '2010',
        accountName: 'Customer Stored-Value Wallets NGN',
        category: 'LIABILITY',
        normalBalance: 'CREDIT',
        currency: 'NGN',
        isSubledgerControl: true,
        subledgerType: 'CUSTOMER_WALLET',
        isActive: true,
        allowManualPosting: false,
        description: 'Total customer digital wallet balances NGN',
        currentBalance: 120000000.0,
      },
      {
        id: 'acc-2020',
        accountCode: '2020',
        accountName: 'Customer Stored-Value Wallets XOF',
        category: 'LIABILITY',
        normalBalance: 'CREDIT',
        currency: 'XOF',
        isSubledgerControl: true,
        subledgerType: 'CUSTOMER_WALLET',
        isActive: true,
        allowManualPosting: false,
        description: 'Total customer digital wallet balances XOF',
        currentBalance: 72000000.0,
      },
      {
        id: 'acc-2100',
        accountCode: '2100',
        accountName: 'Merchant Undisbursed Settlements NGN',
        category: 'LIABILITY',
        normalBalance: 'CREDIT',
        currency: 'NGN',
        isSubledgerControl: true,
        subledgerType: 'MERCHANT_PAYABLE',
        isActive: true,
        allowManualPosting: false,
        description: 'Pending merchant settlement payables',
        currentBalance: 21500000.0,
      },
      {
        id: 'acc-3010',
        accountCode: '3010',
        accountName: 'Retained Earnings & Reserves',
        category: 'EQUITY',
        normalBalance: 'CREDIT',
        currency: 'NGN',
        isSubledgerControl: false,
        isActive: true,
        allowManualPosting: false,
        description: 'Accumulated net surplus / equity',
        currentBalance: 1500000.0,
      },
      {
        id: 'acc-4010',
        accountCode: '4010',
        accountName: 'Transaction Processing Fee Revenue',
        category: 'REVENUE',
        normalBalance: 'CREDIT',
        currency: 'NGN',
        isSubledgerControl: false,
        isActive: true,
        allowManualPosting: false,
        description: 'Local transfer and collection fees',
        currentBalance: 2450000.0,
      },
      {
        id: 'acc-4020',
        accountCode: '4020',
        accountName: 'Merchant Checkout MDR Revenue',
        category: 'REVENUE',
        normalBalance: 'CREDIT',
        currency: 'NGN',
        isSubledgerControl: false,
        isActive: true,
        allowManualPosting: false,
        description: 'Card gateway MDR revenue',
        currentBalance: 1850000.0,
      },
      {
        id: 'acc-4030',
        accountCode: '4030',
        accountName: 'FX Cross-Border Remittance Spread',
        category: 'REVENUE',
        normalBalance: 'CREDIT',
        currency: 'NGN',
        isSubledgerControl: false,
        isActive: true,
        allowManualPosting: false,
        description: 'Foreign exchange trading margin (NGN <-> XOF)',
        currentBalance: 980000.0,
      },
      {
        id: 'acc-5010',
        accountCode: '5010',
        accountName: 'Bank Switching & NIP Session Expenses',
        category: 'EXPENSE',
        normalBalance: 'DEBIT',
        currency: 'NGN',
        isSubledgerControl: false,
        isActive: true,
        allowManualPosting: false,
        description: 'NIBSS and banking network fees incurred',
        currentBalance: 620000.0,
      },
      {
        id: 'acc-7010',
        accountCode: '7010',
        accountName: 'Operational Inflow Suspense',
        category: 'SUSPENSE',
        normalBalance: 'DEBIT',
        currency: 'NGN',
        isSubledgerControl: false,
        isActive: true,
        allowManualPosting: true,
        description: 'Unmatched inbound transfers requiring attribution',
        currentBalance: 150000.0,
      },
    ];

    defaultAccounts.forEach((acc) => this.accounts.set(acc.accountCode, acc));
  }

  private initializeSeedJournals() {
    // Seed balanced journals
    this.journals.push({
      id: 'jrn-seed-001',
      journalNumber: 'JRN-20260901-0001',
      periodId: 'period-2026-09',
      journalDate: '2026-09-01',
      entryType: 'PAYMENT_SETTLEMENT',
      sourceModule: 'PAYMENT_SWITCH',
      sourceReference: 'PAY-REF-NG-INIT-01',
      narration: 'Settlement of NIP Outward batch #001',
      currency: 'NGN',
      totalDebit: 500025,
      totalCredit: 500025,
      isBalanced: true,
      status: 'POSTED',
      createdAt: '2026-09-01T10:00:00Z',
      lines: [
        {
          id: 'line-01',
          journalId: 'jrn-seed-001',
          accountCode: '2010',
          entrySide: 'DEBIT',
          amount: 500025,
          currency: 'NGN',
          country: 'NG',
          legalEntity: 'KORIE_NIGERIA_LTD',
          product: 'WALLET_P2P',
          channel: 'NIP',
          provider: 'PROVIDUS_NG',
          lineNarration: 'Customer Wallet Debit',
        },
        {
          id: 'line-02',
          journalId: 'jrn-seed-001',
          accountCode: '1010',
          entrySide: 'CREDIT',
          amount: 500000,
          currency: 'NGN',
          country: 'NG',
          legalEntity: 'KORIE_NIGERIA_LTD',
          product: 'WALLET_P2P',
          channel: 'NIP',
          provider: 'PROVIDUS_NG',
          lineNarration: 'Providus Settlement Bank Credit',
        },
        {
          id: 'line-03',
          journalId: 'jrn-seed-001',
          accountCode: '4010',
          entrySide: 'CREDIT',
          amount: 25,
          currency: 'NGN',
          country: 'NG',
          legalEntity: 'KORIE_NIGERIA_LTD',
          product: 'WALLET_P2P',
          channel: 'NIP',
          profitCenter: 'PC_FEES',
          lineNarration: 'Transaction Fee Revenue',
        },
      ],
    });
  }

  public getAccounts(): GLAccount[] {
    return Array.from(this.accounts.values());
  }

  public getAccount(code: string): GLAccount | undefined {
    return this.accounts.get(code);
  }

  public getPeriods(): AccountingPeriod[] {
    return [...this.periods];
  }

  public getJournals(limit: number = 100): GLJournal[] {
    return this.journals.slice(-limit).reverse();
  }

  public postJournal(params: {
    journalNumber?: string;
    journalDate?: string;
    entryType: 'STANDARD' | 'PAYMENT_SETTLEMENT' | 'FX_REVALUATION' | 'PERIOD_CLOSING' | 'MANUAL_ADJUSTMENT' | 'REVERSAL';
    sourceModule: 'PAYMENT_SWITCH' | 'WALLET_SUBLEDGER' | 'TREASURY' | 'RECONCILIATION' | 'MANUAL';
    sourceReference?: string;
    paymentId?: string;
    narration: string;
    currency: string;
    lines: GLJournalLine[];
    postedBy?: string;
  }): { success: boolean; journal?: GLJournal; error?: string } {
    // 1. Verify Active Open Period
    const openPeriod = this.periods.find((p) => p.status === 'OPEN');
    if (!openPeriod) {
      return { success: false, error: 'NO_OPEN_ACCOUNTING_PERIOD: Cannot post journal to closed or locked ledger.' };
    }

    if (!params.lines || params.lines.length < 2) {
      return { success: false, error: 'INVALID_JOURNAL: A journal must contain at least 2 balanced lines.' };
    }

    // 2. Compute Debits and Credits and Check Invariant
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of params.lines) {
      const account = this.accounts.get(line.accountCode);
      if (!account) {
        return { success: false, error: `ACCOUNT_NOT_FOUND: Account ${line.accountCode} does not exist in Chart of Accounts.` };
      }
      if (!account.isActive) {
        return { success: false, error: `ACCOUNT_INACTIVE: Account ${line.accountCode} is disabled.` };
      }

      if (line.entrySide === 'DEBIT') {
        totalDebit += line.amount;
      } else if (line.entrySide === 'CREDIT') {
        totalCredit += line.amount;
      }
    }

    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.001) {
      return {
        success: false,
        error: `DOUBLE_ENTRY_VIOLATION: Journal is out of balance. Total Debits (${totalDebit.toFixed(2)}) != Total Credits (${totalCredit.toFixed(2)}). Variance: ${diff.toFixed(4)}`,
      };
    }

    // 3. Create Immutable Journal Entry
    const journalId = `jrn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const journalNumber = params.journalNumber || `JRN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const journal: GLJournal = {
      id: journalId,
      journalNumber,
      periodId: openPeriod.id,
      journalDate: params.journalDate || new Date().toISOString().split('T')[0],
      entryType: params.entryType,
      sourceModule: params.sourceModule,
      sourceReference: params.sourceReference,
      paymentId: params.paymentId,
      narration: params.narration,
      currency: params.currency,
      totalDebit,
      totalCredit,
      isBalanced: true,
      status: 'POSTED',
      postedBy: params.postedBy,
      createdAt: new Date().toISOString(),
      lines: params.lines.map((l, idx) => ({
        ...l,
        id: `line-${journalId}-${idx + 1}`,
        journalId,
      })),
    };

    // 4. Update GL Account Balances
    for (const line of params.lines) {
      const account = this.accounts.get(line.accountCode)!;
      if (account.normalBalance === 'DEBIT') {
        account.currentBalance += line.entrySide === 'DEBIT' ? line.amount : -line.amount;
      } else {
        account.currentBalance += line.entrySide === 'CREDIT' ? line.amount : -line.amount;
      }
      this.accounts.set(line.accountCode, account);
    }

    this.journals.push(journal);
    return { success: true, journal };
  }

  public reverseJournal(journalId: string, reason: string, reversedBy: string): { success: boolean; reversalJournal?: GLJournal; error?: string } {
    const original = this.journals.find((j) => j.id === journalId);
    if (!original) {
      return { success: false, error: 'JOURNAL_NOT_FOUND' };
    }
    if (original.status === 'REVERSED') {
      return { success: false, error: 'ALREADY_REVERSED: Journal has already been reversed.' };
    }

    // Inverted lines for compensating entry
    const invertedLines: GLJournalLine[] = original.lines.map((line) => ({
      ...line,
      entrySide: line.entrySide === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      lineNarration: `Reversal of line ${line.id}: ${reason}`,
    }));

    const reversal = this.postJournal({
      entryType: 'REVERSAL',
      sourceModule: original.sourceModule,
      sourceReference: original.journalNumber,
      paymentId: original.paymentId,
      narration: `Compensating Reversal for ${original.journalNumber}: ${reason}`,
      currency: original.currency,
      lines: invertedLines,
      postedBy: reversedBy,
    });

    if (reversal.success && reversal.journal) {
      original.status = 'REVERSED';
      original.reversalJournalId = reversal.journal.id;
    }

    return reversal;
  }
}
