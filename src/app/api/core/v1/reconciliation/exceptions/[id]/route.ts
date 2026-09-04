import { NextRequest } from 'next/server';
import { ExceptionEngine } from '@/lib/reconciliation/ExceptionEngine';
import { DoubleEntryLedgerEngine } from '@/lib/financial/DoubleEntryLedgerEngine';
import { Transaction360Trace } from '@/types/reconciliationEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exc = ExceptionEngine.getExceptionById(id);

    if (!exc) {
      return ApiResponse.notFound(`Exception ${id} not found.`);
    }

    const journal = exc.compensatingJournalId 
      ? DoubleEntryLedgerEngine.getJournals().find(j => j.id === exc.compensatingJournalId)
      : undefined;

    const trace: Transaction360Trace = {
      businessTransaction: {
        id: exc.transactionId || `tx_${exc.id.slice(0, 8)}`,
        reference: exc.providerReference || exc.exceptionReference,
        type: 'TRANSFER',
        product: 'NIP_DIRECT_COLLECTIONS',
        amountMinor: exc.expectedAmountMinor || exc.actualAmountMinor,
        feeMinor: 10_00,
        currency: exc.currency,
        status: exc.status,
        sender: 'Third-Party Commercial Bank Account',
        receiver: 'KoriePay Virtual Account Pool',
        createdAt: exc.createdAt,
      },
      accountingLedger: {
        journalId: journal?.id,
        journalNumber: journal?.journalNumber,
        postedAt: journal?.postedAt,
        debitLines: journal?.lines.filter(l => l.direction === 'DEBIT').map(l => ({
          accountCode: l.accountCode,
          name: l.accountName,
          amountMinor: l.debitAmount,
        })) || [],
        creditLines: journal?.lines.filter(l => l.direction === 'CREDIT').map(l => ({
          accountCode: l.accountCode,
          name: l.accountName,
          amountMinor: l.creditAmount,
        })) || [],
        isBalanced: true,
      },
      providerExecution: {
        providerCode: exc.providerId,
        providerReference: exc.providerReference || 'N/A',
        status: exc.status === 'RESOLVED' ? 'SUCCESS' : 'PENDING_CONFIRMATION',
        amountMinor: exc.actualAmountMinor,
        respondedAt: exc.createdAt,
        isVerified: exc.status === 'RESOLVED',
      },
      settlementDetails: {
        batchId: exc.settlementBatchId,
        batchNumber: exc.settlementBatchId ? `SETTLE-${exc.settlementBatchId.slice(0, 8)}` : undefined,
        status: exc.status === 'RESOLVED' ? 'SETTLED' : 'HELD_IN_DISPUTE',
        eligibleAmountMinor: exc.expectedAmountMinor,
        netPayableMinor: exc.expectedAmountMinor,
      },
      bankStatement: {
        statementReference: `STMT-058-20260902`,
        bankName: 'Providus Bank Nigeria',
        bankReference: exc.providerReference,
        valueDate: exc.createdAt.slice(0, 10),
        statementAmountMinor: exc.actualAmountMinor,
        isMatched: exc.status === 'RESOLVED',
      },
      reconciliationSummary: {
        matchResult: exc.exceptionType,
        confidenceScore: exc.status === 'RESOLVED' ? 100 : 50,
        discrepancyMinor: exc.differenceMinor,
        hasOpenException: exc.status !== 'RESOLVED',
        exceptionId: exc.id,
      },
    };

    return ApiResponse.success({
      exception: exc,
      transaction360: trace,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'TRANSACTION_360_ERROR', 500);
  }
}
