// Financial Report Engine: Trial Balance, Income Statement, Balance Sheet & Forensic 360° Trace

import { GeneralLedgerEngine } from './GeneralLedgerEngine';
import {
  TrialBalanceReport,
  IncomeStatementReport,
  BalanceSheetReport,
  ForensicTraceRecord,
} from '@/types/financeGlEngine';

export class FinancialReportEngine {
  private static instance: FinancialReportEngine;

  private constructor() {}

  public static getInstance(): FinancialReportEngine {
    if (!FinancialReportEngine.instance) {
      FinancialReportEngine.instance = new FinancialReportEngine();
    }
    return FinancialReportEngine.instance;
  }

  public generateTrialBalance(currency: string = 'NGN'): TrialBalanceReport {
    const glEngine = GeneralLedgerEngine.getInstance();
    const accounts = glEngine.getAccounts().filter((a) => a.currency === currency);

    let totalDebits = 0;
    let totalCredits = 0;

    const rows = accounts.map((acc) => {
      let debitBalance = 0;
      let creditBalance = 0;

      if (acc.normalBalance === 'DEBIT') {
        debitBalance = Math.max(0, acc.currentBalance);
        creditBalance = acc.currentBalance < 0 ? Math.abs(acc.currentBalance) : 0;
      } else {
        creditBalance = Math.max(0, acc.currentBalance);
        debitBalance = acc.currentBalance < 0 ? Math.abs(acc.currentBalance) : 0;
      }

      totalDebits += debitBalance;
      totalCredits += creditBalance;

      return {
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        category: acc.category,
        currency: acc.currency,
        debitBalance,
        creditBalance,
        netBalance: acc.currentBalance,
      };
    });

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    return {
      period: '2026-09 (Current Fiscal Period)',
      generatedAt: new Date().toISOString(),
      currency,
      rows,
      totalDebits,
      totalCredits,
      isBalanced,
    };
  }

  public generateIncomeStatement(currency: string = 'NGN'): IncomeStatementReport {
    const glEngine = GeneralLedgerEngine.getInstance();
    const accounts = glEngine.getAccounts().filter((a) => a.currency === currency);

    const revenueAccounts = accounts.filter((a) => a.category === 'REVENUE');
    const expenseAccounts = accounts.filter((a) => a.category === 'EXPENSE');

    const revenueRows = revenueAccounts.map((a) => ({
      accountCode: a.accountCode,
      accountName: a.accountName,
      category: 'REVENUE' as const,
      amount: a.currentBalance,
    }));

    const expenseRows = expenseAccounts.map((a) => ({
      accountCode: a.accountCode,
      accountName: a.accountName,
      category: 'EXPENSE' as const,
      amount: a.currentBalance,
    }));

    const totalRevenue = revenueRows.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = expenseRows.reduce((sum, r) => sum + r.amount, 0);
    const netOperatingIncome = totalRevenue - totalExpenses;
    const profitMarginPercent = totalRevenue > 0 ? (netOperatingIncome / totalRevenue) * 100 : 0;

    return {
      period: '2026-09 (Current Month-to-Date)',
      generatedAt: new Date().toISOString(),
      currency,
      revenueRows,
      expenseRows,
      totalRevenue,
      totalExpenses,
      netOperatingIncome,
      profitMarginPercent,
    };
  }

  public generateBalanceSheet(currency: string = 'NGN'): BalanceSheetReport {
    const glEngine = GeneralLedgerEngine.getInstance();
    const accounts = glEngine.getAccounts().filter((a) => a.currency === currency);

    const assetRows = accounts
      .filter((a) => a.category === 'ASSET' || a.category === 'CLEARING')
      .map((a) => ({ accountCode: a.accountCode, accountName: a.accountName, amount: a.currentBalance }));

    const liabilityRows = accounts
      .filter((a) => a.category === 'LIABILITY' || a.category === 'SUSPENSE')
      .map((a) => ({ accountCode: a.accountCode, accountName: a.accountName, amount: a.currentBalance }));

    const equityRows = accounts
      .filter((a) => a.category === 'EQUITY')
      .map((a) => ({ accountCode: a.accountCode, accountName: a.accountName, amount: a.currentBalance }));

    const totalAssets = assetRows.reduce((sum, r) => sum + r.amount, 0);
    const totalLiabilities = liabilityRows.reduce((sum, r) => sum + r.amount, 0);
    const totalEquity = equityRows.reduce((sum, r) => sum + r.amount, 0);

    return {
      period: 'As of 2026-09-03',
      generatedAt: new Date().toISOString(),
      currency,
      assetRows,
      liabilityRows,
      equityRows,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1.0,
    };
  }
}
