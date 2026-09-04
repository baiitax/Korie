import { NextRequest } from 'next/server';
import { DoubleEntryLedgerEngine } from '@/lib/financial/DoubleEntryLedgerEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currency = (searchParams.get('currency') as 'NGN' | 'XOF') || 'NGN';

    const allBalances = DoubleEntryLedgerEngine.getAllBalances().filter(
      b => b.currency === currency || b.currency === 'USD'
    );

    const revenueAccounts = allBalances.filter(b => b.category === 'REVENUE');
    const expenseAccounts = allBalances.filter(b => b.category === 'EXPENSE');

    const totalRevenue = revenueAccounts.reduce((sum, b) => sum + b.calculatedBalance, 0);
    const totalExpenses = expenseAccounts.reduce((sum, b) => sum + b.calculatedBalance, 0);
    const netIncome = totalRevenue - totalExpenses;

    return ApiResponse.success({
      reportName: 'Authoritative Profit & Loss Statement (Income Statement)',
      reportingCurrency: currency,
      asOfDate: new Date().toISOString(),
      revenue: {
        total: totalRevenue,
        items: revenueAccounts.map(r => ({ code: r.accountCode, name: r.accountName, balance: r.calculatedBalance })),
      },
      expenses: {
        total: totalExpenses,
        items: expenseAccounts.map(e => ({ code: e.accountCode, name: e.accountName, balance: e.calculatedBalance })),
      },
      netIncome,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'PROFIT_LOSS_ERROR', 500);
  }
}
