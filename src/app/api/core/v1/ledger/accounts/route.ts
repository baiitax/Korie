import { NextRequest } from 'next/server';
import { DoubleEntryLedgerEngine } from '@/lib/financial/DoubleEntryLedgerEngine';
import { getAllAccounts } from '@/lib/financial/ChartOfAccounts';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const balances = DoubleEntryLedgerEngine.getAllBalances();
    const chartAccounts = getAllAccounts();

    return ApiResponse.success({
      count: balances.length,
      accounts: balances,
      chartDefinitions: chartAccounts,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'ACCOUNTS_FETCH_ERROR', 500);
  }
}
