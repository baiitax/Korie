import { NextRequest } from 'next/server';
import { MatchingEngine } from '@/lib/reconciliation/MatchingEngine';
import { ExceptionEngine } from '@/lib/reconciliation/ExceptionEngine';
import { CanonicalReconciliationRecord, ReconciliationRun } from '@/types/reconciliationEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

// In-memory runs store
const runsStore: Map<string, ReconciliationRun> = new Map();

export async function GET(req: NextRequest) {
  try {
    const runs = Array.from(runsStore.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    return ApiResponse.success({
      count: runs.length,
      runs,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'RECON_RUNS_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      reconciliationType, 
      providerId, 
      countryCode, 
      currency, 
      internalRecords, 
      externalRecords, 
      initiatedBy 
    } = body;

    if (!internalRecords || !externalRecords || !Array.isArray(internalRecords) || !Array.isArray(externalRecords)) {
      return ApiResponse.badRequest('internalRecords and externalRecords must be non-empty arrays.');
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const runRef = `RUN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    // 1. Normalize records
    const normalizedInternal: CanonicalReconciliationRecord[] = internalRecords.map((r: any, idx: number) =>
      MatchingEngine.normalizeRecord({
        runId,
        sourceId: `src_int_${idx + 1}`,
        sourceType: 'INTERNAL_TRANSACTION',
        sourceRecordReference: r.reference || `INT-TX-${idx + 1}`,
        transactionReference: r.transactionReference || r.reference,
        externalReference: r.externalReference,
        accountReference: r.accountReference || '1010',
        recordType: r.recordType || 'DEBIT',
        direction: r.direction || 'INBOUND',
        currency: currency || 'NGN',
        amountMinor: r.amountMinor || Math.round((r.amount || 0) * 100),
        valueDate: r.valueDate || now.slice(0, 10),
        transactionDate: r.transactionDate || now,
      })
    );

    const normalizedExternal: CanonicalReconciliationRecord[] = externalRecords.map((r: any, idx: number) =>
      MatchingEngine.normalizeRecord({
        runId,
        sourceId: `src_ext_${idx + 1}`,
        sourceType: 'PROVIDER_REPORT',
        sourceRecordReference: r.reference || `EXT-TX-${idx + 1}`,
        providerReference: r.providerReference || r.reference,
        externalReference: r.externalReference,
        accountReference: r.accountReference || '1010',
        recordType: r.recordType || 'CREDIT',
        direction: r.direction || 'INBOUND',
        currency: currency || 'NGN',
        amountMinor: r.amountMinor || Math.round((r.amount || 0) * 100),
        valueDate: r.valueDate || now.slice(0, 10),
        transactionDate: r.transactionDate || now,
      })
    );

    // 2. Execute 5-level deterministic matching
    const matchOutcome = MatchingEngine.executeMatching(normalizedInternal, normalizedExternal);

    // 3. Create exceptions for unmatched records
    for (const unmatched of matchOutcome.unmatchedInternal) {
      ExceptionEngine.createException({
        runId,
        transactionId: unmatched.transactionReference,
        providerId: providerId || 'PROVIDUS_BANK_NG',
        providerReference: unmatched.providerReference,
        exceptionType: 'MISSING_EXTERNAL',
        expectedAmountMinor: unmatched.amountMinor,
        actualAmountMinor: 0,
        currency: currency || 'NGN',
        rootCause: 'PROVIDER_DELAY',
      });
    }

    for (const unmatched of matchOutcome.unmatchedExternal) {
      ExceptionEngine.createException({
        runId,
        providerId: providerId || 'PROVIDUS_BANK_NG',
        providerReference: unmatched.providerReference,
        exceptionType: 'MISSING_INTERNAL',
        expectedAmountMinor: 0,
        actualAmountMinor: unmatched.amountMinor,
        currency: currency || 'NGN',
        rootCause: 'MISSING_TRANSACTION',
      });
    }

    const totalProcessed = normalizedInternal.length + normalizedExternal.length;
    const totalMatched = matchOutcome.matchedPairs.length * 2;
    const accuracy = totalProcessed > 0 ? parseFloat(((totalMatched / totalProcessed) * 100).toFixed(2)) : 100;

    const run: ReconciliationRun = {
      id: runId,
      runReference: runRef,
      reconciliationType: reconciliationType || '4_WAY_CORE',
      countryCode: countryCode || 'NG',
      currency: currency || 'NGN',
      providerId: providerId || 'PROVIDUS_BANK_NG',
      sourcePeriodStart: now,
      sourcePeriodEnd: now,
      startedAt: now,
      completedAt: new Date().toISOString(),
      status: 'COMPLETED',
      recordsProcessed: totalProcessed,
      recordsMatched: matchOutcome.matchedPairs.length,
      recordsUnmatched: matchOutcome.unmatchedInternal.length + matchOutcome.unmatchedExternal.length,
      recordsPartial: 0,
      recordsException: matchOutcome.unmatchedInternal.length + matchOutcome.unmatchedExternal.length,
      totalExpectedAmountMinor: normalizedInternal.reduce((s, r) => s + r.amountMinor, 0),
      totalActualAmountMinor: normalizedExternal.reduce((s, r) => s + r.amountMinor, 0),
      differenceAmountMinor: Math.abs(
        normalizedInternal.reduce((s, r) => s + r.amountMinor, 0) -
        normalizedExternal.reduce((s, r) => s + r.amountMinor, 0)
      ),
      matchAccuracyPct: accuracy,
      initiatedBy: initiatedBy || 'FINANCE_ADMIN',
      ruleVersion: 'v1.0.0',
      createdAt: now,
    };

    runsStore.set(runId, run);

    return ApiResponse.created({
      run,
      matchedPairsCount: matchOutcome.matchedPairs.length,
      unmatchedInternalCount: matchOutcome.unmatchedInternal.length,
      unmatchedExternalCount: matchOutcome.unmatchedExternal.length,
      matchedPairs: matchOutcome.matchedPairs,
    }, `Reconciliation run ${run.runReference} completed with ${accuracy}% match accuracy.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'RECONCILIATION_EXECUTION_ERROR', 400);
  }
}
