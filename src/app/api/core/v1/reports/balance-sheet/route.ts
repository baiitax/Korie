import { NextRequest } from 'next/server';
import { DoubleEntryLedgerEngine } from '@/lib/financial/DoubleEntryLedgerEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currency = (searchParams.get('currency') as 'NGN' | 'XOF') || 'NGN';

    const tb = DoubleEntryLedgerEngine.generateTrialBalance(currency);

    const assetItems: { code: string; name: string; balance: number }[] = [];
    const liabilityItems: { code: string; name: string; balance: number }[] = [];
    const equityItems: { code: string; name: string; balance: number }[] = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const acc of tb.accounts) {
      if (acc.category === 'ASSET') {
        const bal = acc.debitBalance - acc.creditBalance;
        if (bal !== 0) {
          assetItems.push({ code: acc.code, name: acc.name, balance: bal });
          totalAssets += bal;
        }
      } else if (acc.category === 'LIABILITY' || acc.category === 'SUSPENSE') {
        const bal = acc.creditBalance - acc.debitBalance;
        if (bal !== 0) {
          liabilityItems.push({ code: acc.code, name: acc.name, balance: bal });
          totalLiabilities += bal;
        }
      } else if (acc.category === 'EQUITY') {
        const bal = acc.creditBalance - acc.debitBalance;
        if (bal !== 0) {
          equityItems.push({ code: acc.code, name: acc.name, balance: bal });
          totalEquity += bal;
        }
      } else if (acc.category === 'REVENUE') {
        // Retained earnings include current period P&L
        const netRevenue = acc.creditBalance - acc.debitBalance;
        if (netRevenue !== 0) {
          equityItems.push({ code: `RE-${acc.code}`, name: `Current Period Net: ${acc.name}`, balance: netRevenue });
          totalEquity += netRevenue;
        }
      } else if (acc.category === 'EXPENSE') {
        const netExpense = acc.debitBalance - acc.creditBalance;
        if (netExpense !== 0) {
          equityItems.push({ code: `EXP-${acc.code}`, name: `Current Period Expense: ${acc.name}`, balance: -netExpense });
          totalEquity -= netExpense;
        }
      }
    }

    const totalLiabEquity = totalLiabilities + totalEquity;
    const isBalanced = totalAssets === totalLiabEquity;

    return ApiResponse.success({
      reportName: 'Authoritative Balance Sheet Statement',
      reportingCurrency: currency,
      asOfDate: new Date().toISOString(),
      assets: {
        total: totalAssets,
        items: assetItems,
      },
      liabilities: {
        total: totalLiabilities,
        items: liabilityItems,
      },
      equity: {
        total: totalEquity,
        items: equityItems,
      },
      totalLiabilitiesAndEquity: totalLiabEquity,
      isEquationBalanced: isBalanced,
      variance: Math.abs(totalAssets - totalLiabEquity),
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'BALANCE_SHEET_ERROR', 500);
  }
}
