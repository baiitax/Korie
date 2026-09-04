import { AccountingRuleDef, JournalLine, AccountingDimension } from '@/types/financialEngine';
import { getAccountByCode } from './ChartOfAccounts';

export class AccountingRuleEngine {
  private static rules: Record<string, AccountingRuleDef> = {
    RULE_NGN_P2P_TRANSFER_v1: {
      ruleCode: 'RULE_NGN_P2P_TRANSFER_v1',
      name: 'Nigeria Customer P2P Wallet Transfer',
      version: 'v1',
      transactionType: 'TRANSFER',
      product: 'WALLET',
      country: 'NG',
      currency: 'NGN',
      effectiveFrom: '2026-01-01T00:00:00Z',
      status: 'ACTIVE',
      approvedBy: 'CHIEF_FINANCIAL_OFFICER',
      template: {
        debitAccountCode: '2010', // Customer Wallet Deposits NGN (Debit reduces sender liability)
        creditAccountCode: '2010', // Customer Wallet Deposits NGN (Credit increases receiver liability)
        feeDebitAccountCode: '2010', // Fee debited from sender
        feeCreditAccountCode: '4010', // Fee credited to Transfer Fee Revenue
      },
    },
    RULE_XOF_P2P_TRANSFER_v1: {
      ruleCode: 'RULE_XOF_P2P_TRANSFER_v1',
      name: 'Niger Customer P2P Wallet Transfer',
      version: 'v1',
      transactionType: 'TRANSFER',
      product: 'WALLET',
      country: 'NE',
      currency: 'XOF',
      effectiveFrom: '2026-01-01T00:00:00Z',
      status: 'ACTIVE',
      approvedBy: 'CHIEF_FINANCIAL_OFFICER',
      template: {
        debitAccountCode: '2020',
        creditAccountCode: '2020',
        feeDebitAccountCode: '2020',
        feeCreditAccountCode: '4020',
      },
    },
    RULE_MERCHANT_CHECKOUT_NGN_v1: {
      ruleCode: 'RULE_MERCHANT_CHECKOUT_NGN_v1',
      name: 'Merchant Web Checkout Collection',
      version: 'v1',
      transactionType: 'CHECKOUT',
      product: 'PAYMENT',
      country: 'NG',
      currency: 'NGN',
      effectiveFrom: '2026-01-01T00:00:00Z',
      status: 'ACTIVE',
      approvedBy: 'CHIEF_FINANCIAL_OFFICER',
      template: {
        debitAccountCode: '1010', // Bank settlement pool receives customer funds
        creditAccountCode: '2050', // Merchant payable liability created
        feeDebitAccountCode: '2050', // MDR deducted from merchant
        feeCreditAccountCode: '4030', // MDR Revenue
      },
    },
    RULE_MERCHANT_SETTLEMENT_NGN_v1: {
      ruleCode: 'RULE_MERCHANT_SETTLEMENT_NGN_v1',
      name: 'Merchant Batch Settlement Payout',
      version: 'v1',
      transactionType: 'SETTLEMENT',
      product: 'MERCHANT',
      country: 'NG',
      currency: 'NGN',
      effectiveFrom: '2026-01-01T00:00:00Z',
      status: 'ACTIVE',
      approvedBy: 'CHIEF_FINANCIAL_OFFICER',
      template: {
        debitAccountCode: '2050', // Merchant liability cleared
        creditAccountCode: '1010', // Bank payout disbursed
      },
    },
    RULE_AGENCY_CASH_IN_v1: {
      ruleCode: 'RULE_AGENCY_CASH_IN_v1',
      name: 'Agency Cash-in Deposit',
      version: 'v1',
      transactionType: 'CASH_IN',
      product: 'AGENCY',
      country: 'NG',
      currency: 'NGN',
      effectiveFrom: '2026-01-01T00:00:00Z',
      status: 'ACTIVE',
      approvedBy: 'CHIEF_FINANCIAL_OFFICER',
      template: {
        debitAccountCode: '2030', // Agent float reduced
        creditAccountCode: '2010', // Customer wallet credited
        feeDebitAccountCode: '2010', // Customer pays fee
        feeCreditAccountCode: '4050', // Platform fee
        commissionDebitAccountCode: '5030', // Agent commission expense
        commissionCreditAccountCode: '2030', // Agent float credited with commission
      },
    },
    RULE_AGENCY_CASH_OUT_v1: {
      ruleCode: 'RULE_AGENCY_CASH_OUT_v1',
      name: 'Agency Cash-out Withdrawal',
      version: 'v1',
      transactionType: 'CASH_OUT',
      product: 'AGENCY',
      country: 'NG',
      currency: 'NGN',
      effectiveFrom: '2026-01-01T00:00:00Z',
      status: 'ACTIVE',
      approvedBy: 'CHIEF_FINANCIAL_OFFICER',
      template: {
        debitAccountCode: '2010', // Customer wallet debited
        creditAccountCode: '2030', // Agent float credited
        commissionDebitAccountCode: '5030', // Agent commission expense
        commissionCreditAccountCode: '2030', // Agent float credited with commission
      },
    },
    RULE_SUSPENSE_HOLD_v1: {
      ruleCode: 'RULE_SUSPENSE_HOLD_v1',
      name: 'Suspense Account Allocation',
      version: 'v1',
      transactionType: 'SUSPENSE_PARK',
      product: 'RECONCILIATION',
      country: 'NG',
      currency: 'NGN',
      effectiveFrom: '2026-01-01T00:00:00Z',
      status: 'ACTIVE',
      approvedBy: 'CHIEF_RISK_OFFICER',
      template: {
        debitAccountCode: '1010',
        creditAccountCode: '7100', // Unallocated inbound suspense
      },
    },
  };

  public static getRule(ruleCode: string): AccountingRuleDef | undefined {
    return this.rules[ruleCode];
  }

  public static getAllRules(): AccountingRuleDef[] {
    return Object.values(this.rules);
  }

  public static generateLines(params: {
    journalEntryId: string;
    ruleCode: string;
    principalAmount: number; // minor units
    feeAmount?: number;
    commissionAmount?: number;
    currency: 'NGN' | 'XOF' | 'USD';
    dimension: AccountingDimension;
    narration: string;
  }): JournalLine[] {
    const rule = this.getRule(params.ruleCode);
    if (!rule) {
      throw new Error(`Accounting Rule not found for code: ${params.ruleCode}`);
    }

    const lines: JournalLine[] = [];
    const debitAcc = getAccountByCode(rule.template.debitAccountCode);
    const creditAcc = getAccountByCode(rule.template.creditAccountCode);

    if (!debitAcc || !creditAcc) {
      throw new Error(`Invalid Chart of Account configuration in rule ${params.ruleCode}`);
    }

    // 1. Principal Debit Line
    lines.push({
      id: `jl_${Date.now()}_1`,
      journalEntryId: params.journalEntryId,
      accountCode: debitAcc.code,
      accountName: debitAcc.name,
      category: debitAcc.category,
      direction: 'DEBIT',
      debitAmount: params.principalAmount,
      creditAmount: 0,
      currency: params.currency,
      narration: `${params.narration} (Principal Debit)`,
      dimension: params.dimension,
      createdAt: new Date().toISOString(),
    });

    // 2. Principal Credit Line
    lines.push({
      id: `jl_${Date.now()}_2`,
      journalEntryId: params.journalEntryId,
      accountCode: creditAcc.code,
      accountName: creditAcc.name,
      category: creditAcc.category,
      direction: 'CREDIT',
      debitAmount: 0,
      creditAmount: params.principalAmount,
      currency: params.currency,
      narration: `${params.narration} (Principal Credit)`,
      dimension: params.dimension,
      createdAt: new Date().toISOString(),
    });

    // 3. Fee Postings if present
    if (params.feeAmount && params.feeAmount > 0 && rule.template.feeDebitAccountCode && rule.template.feeCreditAccountCode) {
      const feeDebitAcc = getAccountByCode(rule.template.feeDebitAccountCode)!;
      const feeCreditAcc = getAccountByCode(rule.template.feeCreditAccountCode)!;

      lines.push({
        id: `jl_${Date.now()}_3`,
        journalEntryId: params.journalEntryId,
        accountCode: feeDebitAcc.code,
        accountName: feeDebitAcc.name,
        category: feeDebitAcc.category,
        direction: 'DEBIT',
        debitAmount: params.feeAmount,
        creditAmount: 0,
        currency: params.currency,
        narration: `${params.narration} (Fee Accrual Debit)`,
        dimension: params.dimension,
        createdAt: new Date().toISOString(),
      });

      lines.push({
        id: `jl_${Date.now()}_4`,
        journalEntryId: params.journalEntryId,
        accountCode: feeCreditAcc.code,
        accountName: feeCreditAcc.name,
        category: feeCreditAcc.category,
        direction: 'CREDIT',
        debitAmount: 0,
        creditAmount: params.feeAmount,
        currency: params.currency,
        narration: `${params.narration} (Fee Revenue Credit)`,
        dimension: params.dimension,
        createdAt: new Date().toISOString(),
      });
    }

    // 4. Commission Postings if present
    if (params.commissionAmount && params.commissionAmount > 0 && rule.template.commissionDebitAccountCode && rule.template.commissionCreditAccountCode) {
      const commDebitAcc = getAccountByCode(rule.template.commissionDebitAccountCode)!;
      const commCreditAcc = getAccountByCode(rule.template.commissionCreditAccountCode)!;

      lines.push({
        id: `jl_${Date.now()}_5`,
        journalEntryId: params.journalEntryId,
        accountCode: commDebitAcc.code,
        accountName: commDebitAcc.name,
        category: commDebitAcc.category,
        direction: 'DEBIT',
        debitAmount: params.commissionAmount,
        creditAmount: 0,
        currency: params.currency,
        narration: `${params.narration} (Commission Expense Debit)`,
        dimension: params.dimension,
        createdAt: new Date().toISOString(),
      });

      lines.push({
        id: `jl_${Date.now()}_6`,
        journalEntryId: params.journalEntryId,
        accountCode: commCreditAcc.code,
        accountName: commCreditAcc.name,
        category: commCreditAcc.category,
        direction: 'CREDIT',
        debitAmount: 0,
        creditAmount: params.commissionAmount,
        currency: params.currency,
        narration: `${params.narration} (Agent Float Commission Credit)`,
        dimension: params.dimension,
        createdAt: new Date().toISOString(),
      });
    }

    return lines;
  }
}
