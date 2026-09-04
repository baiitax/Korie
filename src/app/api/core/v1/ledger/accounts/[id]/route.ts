import { NextRequest } from 'next/server';
import { DoubleEntryLedgerEngine } from '@/lib/financial/DoubleEntryLedgerEngine';
import { getAccountByCode } from '@/lib/financial/ChartOfAccounts';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accountCode = id;
    const definition = getAccountByCode(accountCode);
    const balance = DoubleEntryLedgerEngine.getAccountBalance(accountCode);
    const journals = DoubleEntryLedgerEngine.getJournals({ accountCode });

    if (!definition && !balance) {
      return ApiResponse.notFound(`Account code ${accountCode} not found in chart of accounts.`);
    }

    // Extract all individual lines for this specific account
    const lines = journals.flatMap(j => 
      j.lines.filter(l => l.accountCode === accountCode).map(l => ({
        ...l,
        journalNumber: j.journalNumber,
        effectiveAt: j.effectiveAt,
        sourceReference: j.sourceReference,
      }))
    );

    return ApiResponse.success({
      accountCode,
      name: definition?.name || balance?.accountName,
      category: definition?.category || balance?.category,
      currency: balance?.currency || definition?.currency,
      country: definition?.country,
      normalBalance: definition?.normalBalance,
      balance,
      activityCount: lines.length,
      lines,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'ACCOUNT_360_ERROR', 500);
  }
}
