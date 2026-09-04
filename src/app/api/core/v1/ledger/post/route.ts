import { NextRequest } from 'next/server';
import { DoubleEntryLedgerEngine } from '@/lib/financial/DoubleEntryLedgerEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { journalNumber, ruleCode, description, currency, lines, sourceReference, createdBy } = body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return ApiResponse.badRequest('Journal lines are required and must not be empty.');
    }

    const postedEntry = DoubleEntryLedgerEngine.postJournalEntry({
      journalNumber: journalNumber || `JE-${Date.now()}`,
      ruleCode: ruleCode || 'RULE_CUSTOM_POSTING_v1',
      ruleVersion: 'v1',
      description: description || 'Custom double-entry ledger posting',
      currency: currency || 'NGN',
      totalDebit: 0, // Engine will calculate and assert balance
      totalCredit: 0,
      lines,
      effectiveAt: new Date().toISOString(),
      createdBy: createdBy || 'API_USER',
      sourceSystem: 'KORIEPAY_CORE_API',
      sourceReference: sourceReference || `REF-${Date.now()}`,
    });

    return ApiResponse.created(postedEntry, 'Journal entry posted successfully to immutable ledger.');
  } catch (err: any) {
    return ApiResponse.error(err.message, 'LEDGER_POSTING_ERROR', 400);
  }
}

export async function GET(req: NextRequest) {
  const journals = DoubleEntryLedgerEngine.getJournals({ limit: 100 });
  return ApiResponse.success({
    totalCount: journals.length,
    journals,
  });
}
