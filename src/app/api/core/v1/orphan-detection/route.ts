import { NextRequest } from 'next/server';
import { OrphanDetectionEngine } from '@/lib/reconciliation/OrphanDetectionEngine';
import { DoubleEntryLedgerEngine } from '@/lib/financial/DoubleEntryLedgerEngine';
import { SettlementEngine } from '@/lib/settlement/SettlementEngine';
import { BankReconciliationEngine } from '@/lib/reconciliation/BankReconciliationEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const journals = DoubleEntryLedgerEngine.getJournals();
    const batches = SettlementEngine.getBatches();
    const statements = BankReconciliationEngine.getStatements();

    const internalRefs = journals.map(j => j.journalNumber);
    const providerRefs = statements.flatMap(s => BankReconciliationEngine.getStatementLines(s.id).map(l => l.bankReference));
    const batchRefs = batches.map(b => b.batchReference);
    const bankRefs = statements.map(s => s.statementReference);

    const report = OrphanDetectionEngine.runScan({
      internalTxRefs: internalRefs,
      providerTxRefs: providerRefs,
      journalRefs: internalRefs,
      settlementBatchRefs: batchRefs,
      bankMovementRefs: bankRefs,
    });

    return ApiResponse.success(report, 'Orphan detection scan completed.');
  } catch (err: any) {
    return ApiResponse.error(err.message, 'ORPHAN_SCAN_ERROR', 500);
  }
}
