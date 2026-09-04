import { NextRequest } from 'next/server';
import { DoubleEntryLedgerEngine } from '@/lib/financial/DoubleEntryLedgerEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currency = (searchParams.get('currency') as 'NGN' | 'XOF') || 'NGN';

    const trialBalance = DoubleEntryLedgerEngine.generateTrialBalance(currency);

    return ApiResponse.success({
      reportName: 'Authoritative Double-Entry Trial Balance',
      ...trialBalance,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'TRIAL_BALANCE_ERROR', 500);
  }
}
