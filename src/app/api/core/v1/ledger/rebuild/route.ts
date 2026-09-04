import { NextRequest } from 'next/server';
import { DoubleEntryLedgerEngine } from '@/lib/financial/DoubleEntryLedgerEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const startTime = performance.now();
    const rebuiltMap = DoubleEntryLedgerEngine.rebuildAccountBalances();
    const durationMs = performance.now() - startTime;

    const rebuiltList = Array.from(rebuiltMap.values());
    const totalJournals = DoubleEntryLedgerEngine.getJournals().length;

    return ApiResponse.success({
      status: 'SUCCESS',
      rebuiltAccountsCount: rebuiltList.length,
      totalJournalsReplayed: totalJournals,
      executionDurationMs: parseFloat(durationMs.toFixed(2)),
      timestamp: new Date().toISOString(),
      accounts: rebuiltList,
    }, 'Ledger balances successfully rebuilt from immutable journal lines.');
  } catch (err: any) {
    return ApiResponse.error(err.message, 'LEDGER_REBUILD_ERROR', 500);
  }
}
